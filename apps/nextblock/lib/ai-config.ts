import {
  decryptOpenRouterApiKey,
  encryptOpenRouterApiKey,
  getMaskedOpenRouterKey,
  getOpenRouterKeyEnvelopeStatus,
  type EncryptedOpenRouterKeyEnvelope,
} from './ai-key-crypto';

const SERVER_ONLY_ERROR_MESSAGE =
  'Cortex AI configuration can only be imported from server-side code.';

if (typeof window !== 'undefined') {
  throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}

export const CORTEX_AI_PACKAGE_ID = 'cortex-ai';
export const CORTEX_AI_PACKAGE_NAME = 'NextBlock Cortex AI';
export const CORTEX_AI_OPENROUTER_SETTING_KEY = 'cortex_ai_openrouter_api_key';

function readEnvValue(name: string) {
  return process.env[name]?.trim() || null;
}

export function getOpenRouterEnvApiKey() {
  return readEnvValue('OPENROUTER_API_KEY');
}

export function getCortexAiEnvConfig() {
  const openRouterApiKey = getOpenRouterEnvApiKey();

  return {
    encryptionKey: readEnvValue('CORTEX_AI_ENCRYPTION_KEY'),
    freemiusSandboxKey: readEnvValue('FREEMIUS_AI_SANDBOX_KEY'),
    hasEncryptionKey: Boolean(readEnvValue('CORTEX_AI_ENCRYPTION_KEY')),
    hasOpenRouterEnvKey: Boolean(openRouterApiKey),
    openRouterEnvKeyLast4: openRouterApiKey ? openRouterApiKey.slice(-4) : null,
  };
}

function requireEncryptionKey() {
  const encryptionKey = readEnvValue('CORTEX_AI_ENCRYPTION_KEY');

  if (!encryptionKey) {
    throw new Error('CORTEX_AI_ENCRYPTION_KEY is required to manage stored OpenRouter keys.');
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
  return decryptOpenRouterApiKey({
    encryptedKey,
    encryptionSecret: requireEncryptionKey(),
  });
}

export function getStoredOpenRouterKeyStatus(value: unknown) {
  return getOpenRouterKeyEnvelopeStatus(value);
}

export function getEnvOpenRouterKeyStatus() {
  const env = getCortexAiEnvConfig();

  return {
    hasEnvOpenRouterKey: env.hasOpenRouterEnvKey,
    maskedEnvOpenRouterKey: env.openRouterEnvKeyLast4
      ? getMaskedOpenRouterKey(env.openRouterEnvKeyLast4)
      : null,
  };
}

export type { EncryptedOpenRouterKeyEnvelope };
