// Generic, server-only secret encryption for values stored in the database
// (SMTP password, Stripe/Freemius secret keys, ...). Mirrors the AES-256-GCM
// envelope used by Cortex AI's stored OpenRouter key, but provider-agnostic so
// both the app (encrypt on save) and libs/ecommerce (decrypt at runtime) can
// share one implementation.
//
// The root encryption key stays in an env var — it is the root of trust for all
// DB-stored secrets and cannot itself live in the DB (chicken-and-egg). Reads use
// bracket notation because libs/db sets noPropertyAccessFromIndexSignature.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const SECRET_ENVELOPE_ALGORITHM = 'aes-256-gcm';
export const SECRET_ENVELOPE_VERSION = 1;

/** Encrypted-at-rest payload stored as a JSONB value in `site_settings`. */
export type EncryptedSecretEnvelope = {
  algorithm: typeof SECRET_ENVELOPE_ALGORITHM;
  authTag: string;
  ciphertext: string;
  iv: string;
  last4: string;
  updatedAt: string;
  version: typeof SECRET_ENVELOPE_VERSION;
};

function deriveKey(secret: string): Buffer {
  const normalized = secret.trim();
  if (!normalized) {
    throw new Error('A non-empty encryption secret is required to manage stored secrets.');
  }
  return createHash('sha256').update(normalized).digest();
}

/** Type guard: is `value` a well-formed encrypted envelope? */
export function isEncryptedSecretEnvelope(value: unknown): value is EncryptedSecretEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const envelope = value as Partial<EncryptedSecretEnvelope>;
  return (
    envelope.algorithm === SECRET_ENVELOPE_ALGORITHM &&
    envelope.version === SECRET_ENVELOPE_VERSION &&
    typeof envelope.authTag === 'string' &&
    typeof envelope.ciphertext === 'string' &&
    typeof envelope.iv === 'string'
  );
}

function assertEnvelope(value: unknown): EncryptedSecretEnvelope {
  if (!isEncryptedSecretEnvelope(value)) {
    throw new Error('Invalid encrypted secret payload.');
  }
  const envelope = value as EncryptedSecretEnvelope;
  return {
    algorithm: envelope.algorithm,
    authTag: envelope.authTag,
    ciphertext: envelope.ciphertext,
    iv: envelope.iv,
    last4: typeof envelope.last4 === 'string' ? envelope.last4 : '',
    updatedAt: typeof envelope.updatedAt === 'string' ? envelope.updatedAt : '',
    version: envelope.version,
  };
}

export function encryptSecret(params: {
  value: string;
  encryptionSecret: string;
  now?: Date;
}): EncryptedSecretEnvelope {
  const plaintext = params.value.trim();
  if (!plaintext) {
    throw new Error('A non-empty value is required to encrypt a secret.');
  }

  const key = deriveKey(params.encryptionSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(SECRET_ENVELOPE_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: SECRET_ENVELOPE_ALGORITHM,
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    last4: plaintext.slice(-4),
    updatedAt: (params.now ?? new Date()).toISOString(),
    version: SECRET_ENVELOPE_VERSION,
  };
}

export function decryptSecret(params: { envelope: unknown; encryptionSecret: string }): string {
  const envelope = assertEnvelope(params.envelope);
  const key = deriveKey(params.encryptionSecret);

  try {
    const decipher = createDecipheriv(
      SECRET_ENVELOPE_ALGORITHM,
      key,
      Buffer.from(envelope.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Failed to decrypt stored secret.');
  }
}

/** UI-safe masked display, e.g. "•••• 1234". */
export function getMaskedSecret(last4?: string | null): string {
  const normalized = (last4 ?? '').trim();
  return normalized ? `•••• ${normalized}` : 'Stored secret';
}

/** Summarize an envelope for the CMS without exposing the plaintext. */
export function getSecretEnvelopeStatus(value: unknown): {
  hasStoredValue: boolean;
  last4: string | null;
  maskedValue: string | null;
  updatedAt: string | null;
} {
  if (!isEncryptedSecretEnvelope(value)) {
    return { hasStoredValue: false, last4: null, maskedValue: null, updatedAt: null };
  }
  const envelope = value as EncryptedSecretEnvelope;
  const last4 = typeof envelope.last4 === 'string' && envelope.last4 ? envelope.last4 : null;
  return {
    hasStoredValue: true,
    last4,
    maskedValue: getMaskedSecret(last4),
    updatedAt:
      typeof envelope.updatedAt === 'string' && envelope.updatedAt ? envelope.updatedAt : null,
  };
}

// --- Env-key convenience layer -------------------------------------------------
// The root key stays in env. New deployments may set NEXTBLOCK_ENCRYPTION_KEY;
// existing ones reuse the already-provisioned CORTEX_AI_ENCRYPTION_KEY.

export function resolveSecretEncryptionKey(): string | null {
  const fromNextblock = process.env['NEXTBLOCK_ENCRYPTION_KEY'];
  if (typeof fromNextblock === 'string' && fromNextblock.trim()) {
    return fromNextblock.trim();
  }
  const fromCortex = process.env['CORTEX_AI_ENCRYPTION_KEY'];
  if (typeof fromCortex === 'string' && fromCortex.trim()) {
    return fromCortex.trim();
  }
  return null;
}

export function hasSecretEncryptionKey(): boolean {
  return resolveSecretEncryptionKey() !== null;
}

export function requireSecretEncryptionKey(): string {
  const key = resolveSecretEncryptionKey();
  if (!key) {
    throw new Error(
      'An encryption key (NEXTBLOCK_ENCRYPTION_KEY or CORTEX_AI_ENCRYPTION_KEY) is required to manage stored secrets.'
    );
  }
  return key;
}

export function encryptWithEnvKey(value: string, now?: Date): EncryptedSecretEnvelope {
  return encryptSecret({ value, encryptionSecret: requireSecretEncryptionKey(), now });
}

export function decryptWithEnvKey(envelope: unknown): string {
  return decryptSecret({ envelope, encryptionSecret: requireSecretEncryptionKey() });
}

/**
 * Lenient runtime decrypt: returns null instead of throwing when the value is not
 * an envelope or the key is missing/wrong. Use on hot paths (webhooks, checkout)
 * where a missing/invalid secret should fall back to env rather than crash.
 */
export function tryDecryptWithEnvKey(envelope: unknown): string | null {
  if (!isEncryptedSecretEnvelope(envelope)) {
    return null;
  }
  const key = resolveSecretEncryptionKey();
  if (!key) {
    return null;
  }
  try {
    return decryptSecret({ envelope, encryptionSecret: key });
  } catch {
    return null;
  }
}
