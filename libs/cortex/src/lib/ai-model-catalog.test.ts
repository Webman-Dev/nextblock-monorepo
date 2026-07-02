import { describe, expect, it, vi } from 'vitest';

import { listCortexAiCompatibleOpenRouterModels } from './ai-model-catalog';

describe('Cortex AI OpenRouter model catalog', () => {
  it('fetches and filters compatible OpenRouter models', async () => {
    const fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
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
              architecture: { output_modalities: ['text'] },
              id: 'text/no-structured-output',
              name: 'No Structured Output',
              pricing: { completion: '0', prompt: '0' },
              supported_parameters: ['tools'],
            },
          ],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    );

    const models = await listCortexAiCompatibleOpenRouterModels({
      fetch,
      now: new Date('2026-04-29T12:00:00.000Z'),
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/models?supported_parameters=tools%2Cstructured_outputs'),
      expect.objectContaining({
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
    );
    expect(models.map((model) => model.id)).toEqual(['openai/gpt-5.5']);
  });
});
