import { describe, expect, it } from 'vitest';

import {
  buildCortexAiRoutingPolicy,
  buildCortexAiModelFallbackChain,
  CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY,
  CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL,
  CortexAiRoutingError,
  filterCortexAiCompatibleOpenRouterModels,
  isOpenRouterRecoverableRoutingError,
  isOpenRouterRateLimitError,
  omitUnsupportedCortexAiModelOptions,
  runWithCortexAiModelFallback,
  safeParseCortexAiModelSelection,
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

  it('keeps env-key routing locked to the configured free models', () => {
    const policy = buildCortexAiRoutingPolicy({
      credentialSource: 'env',
      requestedModelId: 'openai/gpt-5.5',
    });

    expect(policy.modelIds).toEqual([...CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY]);
    expect(policy.ignoredRequestedModelId).toBe('openai/gpt-5.5');
    expect(policy.modelSelection).toBeNull();
  });

  it('uses the stored BYOK model before free fallbacks', () => {
    const policy = buildCortexAiRoutingPolicy({
      credentialSource: 'stored',
      requestedModelId: 'anthropic/claude-sonnet-4.5',
      selectedModel: {
        contextLength: 128000,
        modelId: 'openai/gpt-5.5',
        name: 'OpenAI: GPT-5.5',
        pricing: { completion: '0.00003', prompt: '0.000005' },
        supportedParameters: ['tools', 'structured_outputs'],
        updatedAt: '2026-04-29T12:00:00.000Z',
      },
    });

    expect(policy.modelIds).toEqual([
      'openai/gpt-5.5',
      ...CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY,
    ]);
    expect(policy.ignoredRequestedModelId).toBe('anthropic/claude-sonnet-4.5');
  });

  it('keeps stored BYOK without a selection on the free registry', () => {
    const policy = buildCortexAiRoutingPolicy({
      credentialSource: 'stored',
      requestedModelId: 'anthropic/claude-sonnet-4.5',
    });

    expect(policy.modelIds).toEqual([...CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY]);
    expect(policy.ignoredRequestedModelId).toBe('anthropic/claude-sonnet-4.5');
  });

  it('filters OpenRouter catalog models to Cortex AI-compatible text models', () => {
    const filtered = filterCortexAiCompatibleOpenRouterModels(
      {
        data: [
          {
            architecture: { output_modalities: ['text'] },
            context_length: 128000,
            id: 'openai/gpt-5.5',
            name: 'OpenAI: GPT-5.5',
            pricing: { completion: '0.00003', prompt: '0.000005' },
            supported_parameters: ['tools', 'structured_outputs', 'temperature'],
          },
          {
            architecture: { output_modalities: ['image'] },
            id: 'image/model',
            name: 'Image Model',
            supported_parameters: ['tools', 'structured_outputs'],
          },
          {
            architecture: { output_modalities: ['text'] },
            id: 'text/no-tools',
            name: 'No Tools',
            supported_parameters: ['structured_outputs'],
          },
          {
            architecture: { output_modalities: ['text'] },
            expiration_date: '2026-04-01T00:00:00.000Z',
            id: 'expired/model',
            name: 'Expired',
            supported_parameters: ['tools', 'structured_outputs'],
          },
        ],
      },
      new Date('2026-04-29T12:00:00.000Z')
    );

    expect(filtered.map((model) => model.id)).toEqual(['openai/gpt-5.5']);
  });

  it('parses stored model selections defensively', () => {
    expect(
      safeParseCortexAiModelSelection({
        contextLength: 128000,
        modelId: 'openai/gpt-5.5',
        name: 'OpenAI: GPT-5.5',
        pricing: { completion: '0.00003', prompt: '0.000005' },
        supportedParameters: ['tools', 'structured_outputs'],
        updatedAt: '2026-04-29T12:00:00.000Z',
      })
    ).toMatchObject({
      modelId: 'openai/gpt-5.5',
      name: 'OpenAI: GPT-5.5',
    });

    expect(
      safeParseCortexAiModelSelection({
        modelId: 'openai/gpt-5.5',
        name: 'OpenAI: GPT-5.5',
        supportedParameters: ['tools'],
        updatedAt: '2026-04-29T12:00:00.000Z',
      })
    ).toBeNull();
  });

  it('strips unsupported optional parameters for the selected paid model only', () => {
    const options = omitUnsupportedCortexAiModelOptions(
      {
        maxRetries: 0,
        prompt: 'Hi',
        temperature: 0.2,
      },
      {
        modelId: 'openai/gpt-5.5',
        modelSelection: {
          contextLength: 128000,
          modelId: 'openai/gpt-5.5',
          name: 'OpenAI: GPT-5.5',
          pricing: {},
          supportedParameters: ['tools', 'structured_outputs'],
          updatedAt: '2026-04-29T12:00:00.000Z',
        },
      }
    );

    expect(options).toEqual({
      maxRetries: 0,
      prompt: 'Hi',
    });
  });
});
