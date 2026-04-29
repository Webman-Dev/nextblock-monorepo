import { APICallError } from 'ai';

export const CORTEX_AI_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL = 'openrouter/free';

export const CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY = [
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-nano-9b-v2:free',
] as const;

export const CORTEX_AI_MODEL_REGISTRY = {
  defaultFreeRouter: CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL,
  defaultStructuredOutputModel: CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY[0],
  defaultToolCallingModel: CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY[0],
  freeFallbacks: CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY,
  structuredJsonPreferred: CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY,
  toolCallingPreferred: CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY,
} as const;

export type CortexAiOpenRouterModelId =
  | typeof CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL
  | (typeof CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY)[number]
  | (string & {});

export type CortexAiModelAttempt = {
  errorMessage?: string;
  modelId: CortexAiOpenRouterModelId;
  rateLimited: boolean;
  status: 'success' | 'rate_limited' | 'retried' | 'failed';
};

export class CortexAiRoutingError extends Error {
  readonly attempts: readonly CortexAiModelAttempt[];

  constructor(message: string, attempts: readonly CortexAiModelAttempt[], cause?: unknown) {
    super(message);
    this.name = 'CortexAiRoutingError';
    this.attempts = attempts;
    this.cause = cause;
  }
}

function uniqueModelIds(modelIds: readonly CortexAiOpenRouterModelId[]) {
  return Array.from(new Set(modelIds.filter(Boolean)));
}

export function buildCortexAiModelFallbackChain(params?: {
  fallbackModelIds?: readonly CortexAiOpenRouterModelId[];
  modelId?: CortexAiOpenRouterModelId | null;
}) {
  return uniqueModelIds([
    params?.modelId || CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY[0],
    ...(params?.fallbackModelIds || CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY),
  ]);
}

function readNumericProperty(value: unknown, property: string) {
  if (!value || typeof value !== 'object' || !(property in value)) {
    return null;
  }

  const raw = (value as Record<string, unknown>)[property];
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getHttpStatusCode(error: unknown): number | null {
  if (APICallError.isInstance(error)) {
    return error.statusCode ?? null;
  }

  const directStatus = readNumericProperty(error, 'statusCode') ?? readNumericProperty(error, 'status');

  if (directStatus) {
    return directStatus;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: unknown }).response;
    const responseStatus = readNumericProperty(response, 'status');

    if (responseStatus) {
      return responseStatus;
    }
  }

  if (error && typeof error === 'object' && 'cause' in error) {
    return getHttpStatusCode((error as { cause?: unknown }).cause);
  }

  return null;
}

export function isOpenRouterRateLimitError(error: unknown) {
  return getHttpStatusCode(error) === 429;
}

function getDeepErrorMessage(error: unknown): string {
  if (!error) {
    return '';
  }

  if (error instanceof Error) {
    const causeMessage = 'cause' in error ? getDeepErrorMessage(error.cause) : '';
    return [error.message, causeMessage].filter(Boolean).join('\n');
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return ['message', 'error', 'text', 'cause']
      .map((key) => getDeepErrorMessage(record[key]))
      .filter(Boolean)
      .join('\n');
  }

  return String(error);
}

export function isOpenRouterRecoverableRoutingError(error: unknown) {
  if (isOpenRouterRateLimitError(error)) {
    return true;
  }

  return /No endpoints found|no longer available|not available as a free model|transitioned to a paid model/i.test(
    getDeepErrorMessage(error)
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown OpenRouter error.';
}

export async function runWithCortexAiModelFallback<T>(params: {
  execute: (modelId: CortexAiOpenRouterModelId) => Promise<T>;
  modelIds: readonly CortexAiOpenRouterModelId[];
  shouldRetry?: (error: unknown) => boolean;
}): Promise<{
  attempts: readonly CortexAiModelAttempt[];
  modelId: CortexAiOpenRouterModelId;
  result: T;
}> {
  const modelIds = uniqueModelIds(params.modelIds);
  const shouldRetry = params.shouldRetry || isOpenRouterRecoverableRoutingError;
  let attempts: readonly CortexAiModelAttempt[] = [];
  let lastError: unknown = null;

  for (const modelId of modelIds) {
    try {
      const result = await params.execute(modelId);
      attempts = [
        ...attempts,
        {
          modelId,
          rateLimited: false,
          status: 'success',
        },
      ];

      return {
        attempts,
        modelId,
        result,
      };
    } catch (error) {
      const rateLimited = isOpenRouterRateLimitError(error);
      const retryable = shouldRetry(error);
      lastError = error;
      attempts = [
        ...attempts,
        {
          errorMessage: getErrorMessage(error),
          modelId,
          rateLimited,
          status: rateLimited ? 'rate_limited' : retryable ? 'retried' : 'failed',
        },
      ];

      if (!retryable) {
        throw new CortexAiRoutingError(
          `OpenRouter request failed for model "${modelId}".`,
          attempts,
          error
        );
      }
    }
  }

  throw new CortexAiRoutingError(
    'OpenRouter fallback exhausted all configured Cortex AI models.',
    attempts,
    lastError
  );
}
