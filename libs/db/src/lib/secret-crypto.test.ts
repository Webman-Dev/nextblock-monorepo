import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  decryptSecret,
  decryptWithEnvKey,
  encryptSecret,
  encryptWithEnvKey,
  getSecretEnvelopeStatus,
  isEncryptedSecretEnvelope,
  resolveSecretEncryptionKey,
  tryDecryptWithEnvKey,
} from './secret-crypto';

const SECRET = 'unit-test-encryption-secret';

describe('secret-crypto', () => {
  it('round-trips a value through encrypt/decrypt', () => {
    const envelope = encryptSecret({ value: 'sk_live_abcd1234', encryptionSecret: SECRET });
    expect(isEncryptedSecretEnvelope(envelope)).toBe(true);
    expect(envelope.last4).toBe('1234');
    expect(envelope.ciphertext).not.toContain('sk_live');
    expect(decryptSecret({ envelope, encryptionSecret: SECRET })).toBe('sk_live_abcd1234');
  });

  it('fails to decrypt with the wrong key', () => {
    const envelope = encryptSecret({ value: 'whsec_topsecret', encryptionSecret: SECRET });
    expect(() => decryptSecret({ envelope, encryptionSecret: 'a-different-key' })).toThrow();
  });

  it('rejects a tampered ciphertext (GCM auth tag)', () => {
    const envelope = encryptSecret({ value: 'whsec_topsecret', encryptionSecret: SECRET });
    const tampered = { ...envelope, ciphertext: Buffer.from('garbage').toString('base64') };
    expect(() => decryptSecret({ envelope: tampered, encryptionSecret: SECRET })).toThrow();
  });

  it('reports envelope status without exposing plaintext', () => {
    const envelope = encryptSecret({ value: 'token-9999', encryptionSecret: SECRET });
    const status = getSecretEnvelopeStatus(envelope);
    expect(status.hasStoredValue).toBe(true);
    expect(status.last4).toBe('9999');
    expect(status.maskedValue).toContain('9999');
    expect(getSecretEnvelopeStatus({ not: 'an envelope' }).hasStoredValue).toBe(false);
  });

  describe('env-key layer', () => {
    const KEYS = [
      'NEXTBLOCK_ENCRYPTION_KEY',
      'CORTEX_AI_ENCRYPTION_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SECRET_KEY',
    ] as const;
    const original: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const k of KEYS) {
        original[k] = process.env[k];
        delete process.env[k];
      }
    });

    afterEach(() => {
      for (const k of KEYS) {
        if (original[k] === undefined) delete process.env[k];
        else process.env[k] = original[k];
      }
    });

    it('prefers NEXTBLOCK_ENCRYPTION_KEY, falls back to CORTEX_AI_ENCRYPTION_KEY', () => {
      process.env['CORTEX_AI_ENCRYPTION_KEY'] = 'cortex-key';
      expect(resolveSecretEncryptionKey()).toBe('cortex-key');
      process.env['NEXTBLOCK_ENCRYPTION_KEY'] = 'nextblock-key';
      expect(resolveSecretEncryptionKey()).toBe('nextblock-key');
    });

    it('encryptWithEnvKey/decryptWithEnvKey round-trip using the env key', () => {
      process.env['CORTEX_AI_ENCRYPTION_KEY'] = 'cortex-key';
      const envelope = encryptWithEnvKey('pi_secret_value');
      expect(decryptWithEnvKey(envelope)).toBe('pi_secret_value');
    });

    it('derives a stable key from the service-role key when no explicit key is set', () => {
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'service-role-secret';
      const derived = resolveSecretEncryptionKey();
      expect(derived).toBeTruthy();
      // Stable: same service key -> same derived key.
      expect(resolveSecretEncryptionKey()).toBe(derived);
      const envelope = encryptWithEnvKey('smtp-password');
      expect(decryptWithEnvKey(envelope)).toBe('smtp-password');
    });

    it('still decrypts a derived-key secret after an explicit key is added later', () => {
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'service-role-secret';
      const envelope = encryptWithEnvKey('smtp-password'); // encrypted with derived key
      // Operator later adds an explicit key — it becomes preferred for encryption...
      process.env['NEXTBLOCK_ENCRYPTION_KEY'] = 'explicit-key';
      expect(resolveSecretEncryptionKey()).toBe('explicit-key');
      // ...but the old secret is still readable because decryption tries all candidates.
      expect(tryDecryptWithEnvKey(envelope)).toBe('smtp-password');
    });

    it('tryDecryptWithEnvKey returns null instead of throwing when no key is set', () => {
      const envelope = encryptSecret({ value: 'x', encryptionSecret: SECRET });
      expect(tryDecryptWithEnvKey(envelope)).toBeNull();
      expect(tryDecryptWithEnvKey({ junk: true })).toBeNull();
    });
  });
});
