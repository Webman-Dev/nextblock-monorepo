import {
  encryptOpenRouterApiKey,
  getMaskedOpenRouterKey,
  getOpenRouterKeyEnvelopeStatus,
  type EncryptedOpenRouterKeyEnvelope,
} from './ai-key-crypto';
import {
  hasSecretEncryptionKey,
  resolveSecretEncryptionKey,
  tryDecryptWithEnvKey,
} from '@nextblock-cms/db/secrets';

const SERVER_ONLY_ERROR_MESSAGE =
  'Cortex AI configuration can only be imported from server-side code.';

function assertServerOnly() {
  if (typeof window === 'undefined') {
    return;
  }

  throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}

export const CORTEX_AI_PACKAGE_ID = 'cortex-ai';
export const CORTEX_AI_PACKAGE_NAME = 'NextBlock Cortex AI';
export const CORTEX_AI_OPENROUTER_SETTING_KEY = 'cortex_ai_openrouter_api_key';
export const CORTEX_AI_OPENROUTER_MODEL_SELECTION_SETTING_KEY =
  'cortex_ai_openrouter_model_selection';

function readEnvValue(name: string) {
  return process.env[name]?.trim() || null;
}

export function getOpenRouterEnvApiKey() {
  assertServerOnly();
  return readEnvValue('OPENROUTER_API_KEY');
}

export function getCortexAiEnvConfig() {
  assertServerOnly();
  const openRouterApiKey = getOpenRouterEnvApiKey();

  return {
    encryptionKey: readEnvValue('CORTEX_AI_ENCRYPTION_KEY'),
    freemiusSandboxKey: readEnvValue('FREEMIUS_AI_SANDBOX_KEY'),
    // True when ANY usable key exists: an explicit env key OR the service-role-derived
    // fallback — so BYOK works on a one-click Vercel deploy with no extra env var.
    hasEncryptionKey: hasSecretEncryptionKey(),
    hasOpenRouterEnvKey: Boolean(openRouterApiKey),
    openRouterEnvKeyLast4: openRouterApiKey ? openRouterApiKey.slice(-4) : null,
  };
}

function requireEncryptionKey() {
  assertServerOnly();
  // Resolve via the shared chain: NEXTBLOCK_ENCRYPTION_KEY -> CORTEX_AI_ENCRYPTION_KEY ->
  // a stable key derived from the Supabase service-role key. The derived fallback lets
  // BYOK work out-of-the-box on hosted installs (e.g. one-click Vercel).
  const encryptionKey = resolveSecretEncryptionKey();

  if (!encryptionKey) {
    throw new Error(
      'An encryption key (NEXTBLOCK_ENCRYPTION_KEY, CORTEX_AI_ENCRYPTION_KEY, or a Supabase service-role key) is required to manage stored OpenRouter keys.'
    );
  }

  return encryptionKey;
}

export function encryptStoredOpenRouterApiKey(apiKey: string) {
  return encryptOpenRouterApiKey({
    apiKey,
    encryptionSecret: requireEncryptionKey(),
  });
}

export function decryptStoredOpenRouterApiKey(encryptedKey: unknown) {
  assertServerOnly();
  // Try every candidate key (explicit env keys + the derived fallback). This keeps a key
  // stored under one key readable if another is added later, and matches the SMTP/payment
  // secret behaviour. The envelope is byte-compatible with the shared secret-crypto format.
  const result = tryDecryptWithEnvKey(encryptedKey);

  if (result === null) {
    throw new Error('Failed to decrypt stored OpenRouter key.');
  }

  return result;
}

export function getStoredOpenRouterKeyStatus(value: unknown) {
  return getOpenRouterKeyEnvelopeStatus(value);
}

export function getEnvOpenRouterKeyStatus() {
  assertServerOnly();
  const env = getCortexAiEnvConfig();

  return {
    hasEnvOpenRouterKey: env.hasOpenRouterEnvKey,
    maskedEnvOpenRouterKey: env.openRouterEnvKeyLast4
      ? getMaskedOpenRouterKey(env.openRouterEnvKeyLast4)
      : null,
  };
}

export type { EncryptedOpenRouterKeyEnvelope };
