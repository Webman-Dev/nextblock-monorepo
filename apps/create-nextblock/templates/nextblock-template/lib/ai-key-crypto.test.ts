import { describe, expect, it } from 'vitest';

import {
  decryptOpenRouterApiKey,
  encryptOpenRouterApiKey,
  getMaskedOpenRouterKey,
  getOpenRouterKeyEnvelopeStatus,
} from './ai-key-crypto';

describe('Cortex AI OpenRouter key crypto', () => {
  const apiKey = 'sk-or-v1-test-secret-1234567890';
  const encryptionSecret = 'local-test-encryption-secret';

  it('encrypts and decrypts an OpenRouter key', () => {
    const encryptedKey = encryptOpenRouterApiKey({
      apiKey,
      encryptionSecret,
      now: new Date('2026-04-27T12:00:00.000Z'),
    });

    expect(decryptOpenRouterApiKey({ encryptedKey, encryptionSecret })).toBe(apiKey);
  });

  it('does not store the raw key in the encrypted payload', () => {
    const encryptedKey = encryptOpenRouterApiKey({
      apiKey,
      encryptionSecret,
    });

    expect(JSON.stringify(encryptedKey)).not.toContain(apiKey);
    expect(encryptedKey.last4).toBe('7890');
  });

  it('fails safely when the encryption secret is wrong or missing', () => {
    const encryptedKey = encryptOpenRouterApiKey({
      apiKey,
      encryptionSecret,
    });

    expect(() =>
      decryptOpenRouterApiKey({
        encryptedKey,
        encryptionSecret: 'wrong-secret',
      })
    ).toThrow('Failed to decrypt stored OpenRouter key.');

    expect(() =>
      encryptOpenRouterApiKey({
        apiKey,
        encryptionSecret: '',
      })
    ).toThrow('CORTEX_AI_ENCRYPTION_KEY is required');
  });

  it('reports masked stored key status', () => {
    const encryptedKey = encryptOpenRouterApiKey({
      apiKey,
      encryptionSecret,
      now: new Date('2026-04-27T12:00:00.000Z'),
    });

    expect(getMaskedOpenRouterKey(encryptedKey.last4)).toBe('**** 7890');
    expect(getOpenRouterKeyEnvelopeStatus(encryptedKey)).toEqual({
      hasStoredKey: true,
      last4: '7890',
      maskedKey: '**** 7890',
      updatedAt: '2026-04-27T12:00:00.000Z',
    });
  });
});
