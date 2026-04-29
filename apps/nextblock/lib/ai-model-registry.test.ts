import { describe, expect, it } from 'vitest';

import {
  buildCortexAiModelFallbackChain,
  CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY,
  CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL,
  CortexAiRoutingError,
  isOpenRouterRecoverableRoutingError,
  isOpenRouterRateLimitError,
  runWithCortexAiModelFallback,
} from './ai-model-registry';

describe('Cortex AI OpenRouter routing', () => {
  it('builds a free-model fallback chain with preferred overrides', () => {
    expect(buildCortexAiModelFallbackChain()).toEqual([
      ...CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY,
    ]);

    expect(
      buildCortexAiModelFallbackChain({
        modelId: 'openai/gpt-oss-120b:free',
      })
    ).toEqual([
      'openai/gpt-oss-120b:free',
      ...CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY.filter(
        (modelId) => modelId !== 'openai/gpt-oss-120b:free'
      ),
    ]);
  });

  it('detects OpenRouter rate limit errors across common error shapes', () => {
    expect(isOpenRouterRateLimitError({ statusCode: 429 })).toBe(true);
    expect(isOpenRouterRateLimitError({ response: { status: 429 } })).toBe(true);
    expect(isOpenRouterRateLimitError({ cause: { status: 429 } })).toBe(true);
    expect(isOpenRouterRateLimitError({ statusCode: 500 })).toBe(false);
  });

  it('detects recoverable OpenRouter routing errors for unavailable free models', () => {
    expect(
      isOpenRouterRecoverableRoutingError(
        new Error('No endpoints found that can handle the requested parameters.')
      )
    ).toBe(true);
    expect(
      isOpenRouterRecoverableRoutingError(
        new Error('Model is no longer available as a free model.')
      )
    ).toBe(true);
    expect(isOpenRouterRecoverableRoutingError({ statusCode: 401 })).toBe(false);
  });

  it('retries alternate free models after a 429', async () => {
    const tried: string[] = [];
    const result = await runWithCortexAiModelFallback({
      modelIds: [
        CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL,
        'nvidia/nemotron-3-super-120b-a12b:free',
      ],
      execute: async (modelId) => {
        tried.push(modelId);

        if (modelId === CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL) {
          throw { statusCode: 429 };
        }

        return `ok:${modelId}`;
      },
    });

    expect(tried).toEqual([
      CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL,
      'nvidia/nemotron-3-super-120b-a12b:free',
    ]);
    expect(result.modelId).toBe('nvidia/nemotron-3-super-120b-a12b:free');
    expect(result.result).toBe('ok:nvidia/nemotron-3-super-120b-a12b:free');
    expect(result.attempts.map((attempt) => attempt.status)).toEqual([
      'rate_limited',
      'success',
    ]);
  });

  it('stops retrying on non-recoverable failures', async () => {
    await expect(
      runWithCortexAiModelFallback({
        modelIds: [
          CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL,
          'nvidia/nemotron-3-super-120b-a12b:free',
        ],
        execute: async () => {
          throw { statusCode: 401 };
        },
      })
    ).rejects.toBeInstanceOf(CortexAiRoutingError);
  });
});
