import {
  CORTEX_AI_OPENROUTER_BASE_URL,
  CORTEX_AI_REQUIRED_MODEL_PARAMETERS,
  filterCortexAiCompatibleOpenRouterModels,
  type CortexAiCompatibleOpenRouterModel,
} from './ai-model-registry';

const SERVER_ONLY_ERROR_MESSAGE =
  'Cortex AI OpenRouter model catalog can only be imported from server-side code.';

function assertServerOnly() {
  if (typeof window === 'undefined') {
    return;
  }

  throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}

type FetchFunction = typeof globalThis.fetch;

function buildOpenRouterModelsUrl() {
  const url = new URL(`${CORTEX_AI_OPENROUTER_BASE_URL}/models`);
  url.searchParams.set('supported_parameters', CORTEX_AI_REQUIRED_MODEL_PARAMETERS.join(','));
  url.searchParams.set('output_modalities', 'text');
  return url.toString();
}

export async function listCortexAiCompatibleOpenRouterModels(params?: {
  fetch?: FetchFunction;
  now?: Date;
}): Promise<CortexAiCompatibleOpenRouterModel[]> {
  assertServerOnly();
  const fetchImpl = params?.fetch || globalThis.fetch;
  const response = await fetchImpl(buildOpenRouterModelsUrl(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load OpenRouter models: ${response.status} ${response.statusText}`);
  }

  return filterCortexAiCompatibleOpenRouterModels(await response.json(), params?.now);
}
