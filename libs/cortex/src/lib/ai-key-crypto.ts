import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export const CORTEX_AI_KEY_ALGORITHM = 'aes-256-gcm';
export const CORTEX_AI_KEY_ENVELOPE_VERSION = 1;

export type EncryptedOpenRouterKeyEnvelope = {
  algorithm: typeof CORTEX_AI_KEY_ALGORITHM;
  authTag: string;
  ciphertext: string;
  iv: string;
  last4: string;
  updatedAt: string;
  version: typeof CORTEX_AI_KEY_ENVELOPE_VERSION;
};

function normalizeSecret(secret: string) {
  const normalizedSecret = secret.trim();

  if (!normalizedSecret) {
    throw new Error('CORTEX_AI_ENCRYPTION_KEY is required to manage stored OpenRouter keys.');
  }

  return createHash('sha256').update(normalizedSecret).digest();
}

function assertEnvelope(value: unknown): EncryptedOpenRouterKeyEnvelope {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid encrypted OpenRouter key payload.');
  }

  const envelope = value as Partial<EncryptedOpenRouterKeyEnvelope>;

  if (
    envelope.algorithm !== CORTEX_AI_KEY_ALGORITHM ||
    envelope.version !== CORTEX_AI_KEY_ENVELOPE_VERSION ||
    typeof envelope.authTag !== 'string' ||
    typeof envelope.ciphertext !== 'string' ||
    typeof envelope.iv !== 'string'
  ) {
    throw new Error('Invalid encrypted OpenRouter key payload.');
  }

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

export function getMaskedOpenRouterKey(last4?: string | null) {
  const normalizedLast4 = (last4 || '').trim();
  return normalizedLast4 ? `**** ${normalizedLast4}` : 'Stored key';
}

export function encryptOpenRouterApiKey(params: {
  apiKey: string;
  encryptionSecret: string;
  now?: Date;
}): EncryptedOpenRouterKeyEnvelope {
  const apiKey = params.apiKey.trim();

  if (!apiKey) {
    throw new Error('OpenRouter API key is required.');
  }

  const key = normalizeSecret(params.encryptionSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(CORTEX_AI_KEY_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: CORTEX_AI_KEY_ALGORITHM,
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    last4: apiKey.slice(-4),
    updatedAt: (params.now || new Date()).toISOString(),
    version: CORTEX_AI_KEY_ENVELOPE_VERSION,
  };
}

export function decryptOpenRouterApiKey(params: {
  encryptedKey: unknown;
  encryptionSecret: string;
}) {
  const envelope = assertEnvelope(params.encryptedKey);
  const key = normalizeSecret(params.encryptionSecret);

  try {
    const decipher = createDecipheriv(
      CORTEX_AI_KEY_ALGORITHM,
      key,
      Buffer.from(envelope.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Failed to decrypt stored OpenRouter key.');
  }
}

export function getOpenRouterKeyEnvelopeStatus(value: unknown) {
  try {
    const envelope = assertEnvelope(value);

    return {
      hasStoredKey: true,
      last4: envelope.last4 || null,
      maskedKey: getMaskedOpenRouterKey(envelope.last4),
      updatedAt: envelope.updatedAt || null,
    };
  } catch {
    return {
      hasStoredKey: false,
      last4: null,
      maskedKey: null,
      updatedAt: null,
    };
  }
}
