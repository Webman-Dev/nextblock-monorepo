import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type LanguageModel } from 'ai';

import {
  CORTEX_AI_OPENROUTER_SETTING_KEY,
  CORTEX_AI_PACKAGE_NAME,
  decryptStoredOpenRouterApiKey,
  getOpenRouterEnvApiKey,
} from './ai-config';
import {
  buildCortexAiModelFallbackChain,
  CORTEX_AI_OPENROUTER_BASE_URL,
  type CortexAiModelAttempt,
  type CortexAiOpenRouterModelId,
  runWithCortexAiModelFallback,
} from './ai-model-registry';

type AiGenerateTextOptions = Omit<Parameters<typeof generateText>[0], 'model'>;
type AiGenerateTextResult = Awaited<ReturnType<typeof generateText>>;
type FetchFunction = typeof globalThis.fetch;

const SERVER_ONLY_ERROR_MESSAGE =
  'Cortex AI OpenRouter client can only be imported from server-side code.';

if (typeof window !== 'undefined') {
  throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}

export type CortexAiOpenRouterCredentialSource = 'env' | 'stored' | 'manual' | 'none';

export type CortexAiOpenRouterCredential = {
  apiKey: string | null;
  source: CortexAiOpenRouterCredentialSource;
};

export type CortexAiOpenRouterClient = {
  credentialSource: Exclude<CortexAiOpenRouterCredentialSource, 'none'>;
  model: (modelId?: CortexAiOpenRouterModelId) => LanguageModel;
};

export type CortexAiGenerateTextOptions = AiGenerateTextOptions & {
  apiKey?: string;
  fallbackModelIds?: readonly CortexAiOpenRouterModelId[];
  modelId?: CortexAiOpenRouterModelId;
};

export type CortexAiGenerateTextResult = {
  attempts: readonly CortexAiModelAttempt[];
  credentialSource: Exclude<CortexAiOpenRouterCredentialSource, 'none'>;
  modelId: CortexAiOpenRouterModelId;
  result: AiGenerateTextResult;
};

function buildOpenRouterHeaders() {
  const referer = process.env.NEXT_PUBLIC_URL?.trim() || 'https://nextblock.dev';

  return {
    'HTTP-Referer': referer,
    'X-Title': CORTEX_AI_PACKAGE_NAME,
  };
}

export function createCortexAiOpenRouterProvider(params: {
  apiKey: string;
  fetch?: FetchFunction;
}) {
  return createOpenAICompatible<string, string, string, string>({
    apiKey: params.apiKey,
    baseURL: CORTEX_AI_OPENROUTER_BASE_URL,
    fetch: params.fetch,
    headers: buildOpenRouterHeaders(),
    includeUsage: true,
    name: 'openrouter',
    supportsStructuredOutputs: true,
  });
}

async function readStoredOpenRouterApiKey() {
  const { getServiceRoleSupabaseClient } = require('../../../libs/db/src/server') as typeof import('../../../libs/db/src/server');
  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', CORTEX_AI_OPENROUTER_SETTING_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load stored Cortex AI OpenRouter key: ${error.message}`);
  }

  if (!data?.value) {
    return null;
  }

  return decryptStoredOpenRouterApiKey(data.value);
}

export async function resolveCortexAiOpenRouterCredential(params?: {
  apiKey?: string;
}): Promise<CortexAiOpenRouterCredential> {
  const manualApiKey = params?.apiKey?.trim();

  if (manualApiKey) {
    return {
      apiKey: manualApiKey,
      source: 'manual',
    };
  }

  const envApiKey = getOpenRouterEnvApiKey();

  if (envApiKey) {
    return {
      apiKey: envApiKey,
      source: 'env',
    };
  }

  const storedApiKey = await readStoredOpenRouterApiKey();

  if (storedApiKey) {
    return {
      apiKey: storedApiKey,
      source: 'stored',
    };
  }

  return {
    apiKey: null,
    source: 'none',
  };
}

export async function createCortexAiOpenRouterClient(params?: {
  apiKey?: string;
  fetch?: FetchFunction;
}) {
  const credential = await resolveCortexAiOpenRouterCredential({
    apiKey: params?.apiKey,
  });

  if (!credential.apiKey || credential.source === 'none') {
    throw new Error(
      'Cortex AI requires OPENROUTER_API_KEY or an encrypted OpenRouter BYOK in site settings.'
    );
  }

  const provider = createCortexAiOpenRouterProvider({
    apiKey: credential.apiKey,
    fetch: params?.fetch,
  });

  return {
    credentialSource: credential.source,
    model: (modelId?: CortexAiOpenRouterModelId) => provider.chatModel(modelId || 'openrouter/free'),
  };
}

export async function generateCortexAiText({
  apiKey,
  fallbackModelIds,
  modelId,
  ...options
}: CortexAiGenerateTextOptions): Promise<CortexAiGenerateTextResult> {
  const client = await createCortexAiOpenRouterClient({ apiKey });
  const modelIds = buildCortexAiModelFallbackChain({
    fallbackModelIds,
    modelId,
  });

  const generation = await runWithCortexAiModelFallback({
    modelIds,
    execute: (attemptModelId) =>
      generateText({
        ...options,
        maxRetries: 0,
        model: client.model(attemptModelId),
      } as Parameters<typeof generateText>[0]),
  });

  return {
    attempts: generation.attempts,
    credentialSource: client.credentialSource,
    modelId: generation.modelId,
    result: generation.result,
  };
}

export {
  buildCortexAiModelFallbackChain,
  CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY,
  CORTEX_AI_MODEL_REGISTRY,
  CORTEX_AI_OPENROUTER_BASE_URL,
  CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL,
  CortexAiRoutingError,
  isOpenRouterRateLimitError,
  runWithCortexAiModelFallback,
} from './ai-model-registry';
