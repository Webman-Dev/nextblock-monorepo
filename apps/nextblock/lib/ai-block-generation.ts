import { generateObject } from 'ai';
import { z } from 'zod';

import {
  buildCortexAiModelFallbackChain,
  createCortexAiOpenRouterClient,
} from './ai-client';
import {
  getHttpStatusCode,
  isOpenRouterRateLimitError,
  runWithCortexAiModelFallback,
  type CortexAiModelAttempt,
  type CortexAiOpenRouterModelId,
} from './ai-model-registry';

export const generateEditorBlocksRequestSchema = z.strictObject({
  context: z.string().max(2000).optional(),
  prompt: z.string().min(3).max(4000),
});

export type GenerateEditorBlocksRequest = z.infer<typeof generateEditorBlocksRequestSchema>;

export type EditorBlockDocument = {
  content?: unknown[];
  type: 'doc';
};

export type GenerateEditorBlockDocumentResult = {
  attempts: readonly CortexAiModelAttempt[];
  credentialSource: 'env' | 'stored' | 'manual';
  document: EditorBlockDocument;
  modelId: CortexAiOpenRouterModelId;
};

function loadEditorBlockSchemas() {
  return require('../../../schemas/editor-blocks') as typeof import('../../../schemas/editor-blocks');
}

function buildStructuralCmsArchitectSystemPrompt(schemaAwarenessString: string) {
  return [
  'You are a Structural CMS Architect for NextBlock Cortex AI.',
  'Your only job is to generate strict Tiptap JSON content for a block-based CMS editor.',
  schemaAwarenessString,
  'Use semantic Tiptap structures. For pricing tables, return exactly one table with a single header row and one body row per tier. Every table must contain tableRow nodes; every row must contain tableHeader or tableCell nodes; every cell must contain at least one paragraph with text.',
  'Always return at least one meaningful top-level block in content.',
  'Prefer concise, production-ready copy. Keep generated content editable and avoid unsupported custom node types.',
  'Return ONLY the raw JSON object conforming to the schema. Do not include markdown code blocks, conversational text, or explanations. The output must be ready for immediate PostgreSQL JSONB insertion.',
].join(' ');
}

function buildGenerationPrompt(params: GenerateEditorBlocksRequest) {
  return [
    'Generate a Tiptap JSON document for this editor request:',
    params.prompt,
    params.context ? `Context: ${params.context}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function isRecoverableStructuredGenerationError(error: unknown) {
  const statusCode = getHttpStatusCode(error);

  if (statusCode === 401 || statusCode === 402 || statusCode === 403) {
    return false;
  }

  if (isOpenRouterRateLimitError(error)) {
    return true;
  }

  if (statusCode && statusCode >= 500) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /NoObjectGenerated|No object generated|NoContentGenerated|No content generated|could not parse|Invalid JSON response|Provider returned error|TypeValidation|JSONParse|response_format|schema|required editor node|No endpoints found/i.test(
    message
  );
}

function containsNodeType(node: unknown, type: string): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const record = node as { content?: unknown; type?: unknown };

  if (record.type === type) {
    return true;
  }

  return Array.isArray(record.content)
    ? record.content.some((child) => containsNodeType(child, type))
    : false;
}

function getRequiredNodeTypeForPrompt(prompt: string) {
  return /\b(table|pricing table|comparison table)\b/i.test(prompt) ? 'table' : null;
}

function getMinimumTableRowsForPrompt(prompt: string) {
  const tierMatch = prompt.match(/\b(\d+|three|four|five)[-\s]?tier\b/i);

  if (!tierMatch) {
    return /\bpricing table\b/i.test(prompt) ? 4 : 2;
  }

  const rawCount = tierMatch[1].toLowerCase();
  const tierCount =
    rawCount === 'three'
      ? 3
      : rawCount === 'four'
        ? 4
        : rawCount === 'five'
          ? 5
          : Number(rawCount);

  return Number.isFinite(tierCount) && tierCount > 0 ? tierCount + 1 : 4;
}

function getMinimumTableColumnsForPrompt(prompt: string) {
  return /\bpricing table\b/i.test(prompt) ? 3 : 2;
}

export async function generateEditorBlockDocument(
  params: GenerateEditorBlocksRequest & {
    fallbackModelIds?: readonly CortexAiOpenRouterModelId[];
    modelId?: CortexAiOpenRouterModelId;
  }
): Promise<GenerateEditorBlockDocumentResult> {
  const { fallbackModelIds, modelId, ...requestParams } = params;
  const request = generateEditorBlocksRequestSchema.parse(requestParams);
  const client = await createCortexAiOpenRouterClient();
  const {
    createEditorGeneratedTableDocumentSchema,
    editorBlockDocumentSchema,
    editorGeneratedBlockDocumentSchema,
    getEditorBlocksSchemaAwarenessString,
  } = loadEditorBlockSchemas();
  const requiredNodeType = getRequiredNodeTypeForPrompt(request.prompt);
  const outputSchema =
    requiredNodeType === 'table'
      ? createEditorGeneratedTableDocumentSchema({
          minColumns: getMinimumTableColumnsForPrompt(request.prompt),
          minRows: getMinimumTableRowsForPrompt(request.prompt),
        })
      : editorGeneratedBlockDocumentSchema;
  const modelIds = buildCortexAiModelFallbackChain({
    fallbackModelIds,
    modelId,
  });

  const generation = await runWithCortexAiModelFallback({
    modelIds,
    shouldRetry: isRecoverableStructuredGenerationError,
    execute: async (attemptModelId) => {
      const result = await generateObject({
        maxOutputTokens: 5000,
        maxRetries: 0,
        model: client.model(attemptModelId),
        prompt: buildGenerationPrompt(request),
        providerOptions: {
          openrouter: {
            plugins: [{ id: 'response-healing' }],
            provider: {
              require_parameters: true,
            },
          },
        },
        schema: outputSchema,
        schemaDescription:
          'A strict Tiptap JSON document for immediate insertion into a PostgreSQL JSONB editor field.',
        schemaName: 'NextBlockTiptapDocument',
        system: buildStructuralCmsArchitectSystemPrompt(getEditorBlocksSchemaAwarenessString()),
        temperature: 0.2,
      });

      const document = outputSchema.parse(result.object);
      const validatedDocument = editorBlockDocumentSchema.parse(document);

      if (requiredNodeType && !containsNodeType(validatedDocument, requiredNodeType)) {
        throw new Error(`Generated document did not include required editor node: ${requiredNodeType}`);
      }

      return validatedDocument;
    },
  });

  return {
    attempts: generation.attempts,
    credentialSource: client.credentialSource,
    document: generation.result,
    modelId: generation.modelId,
  };
}

export const STRUCTURAL_CMS_ARCHITECT_SYSTEM_PROMPT =
  'Built at runtime with the active Tiptap schema awareness string.';
