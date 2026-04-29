import { generateObject } from 'ai';
import { z } from 'zod';

import {
  buildCortexAiRoutingPolicy,
  createCortexAiOpenRouterClient,
} from './ai-client';
import {
  getHttpStatusCode,
  isOpenRouterRecoverableRoutingError,
  omitUnsupportedCortexAiModelOptions,
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

const CORTEX_AI_BLOCK_GENERATION_ATTEMPT_TIMEOUT_MS = 60_000;

function loadEditorBlockSchemas() {
  return require('../../../schemas/editor-blocks') as typeof import('../../../schemas/editor-blocks');
}

function buildStructuralCmsArchitectSystemPrompt(schemaAwarenessString: string) {
  return [
  'You are a Structural CMS Architect for NextBlock Cortex AI.',
  'Your only job is to generate strict Tiptap JSON content for a block-based CMS editor.',
  schemaAwarenessString,
  'Use semantic Tiptap structures. If the user asks for descriptive copy plus a table, place the descriptive copy in separate top-level heading or paragraph nodes before the table, never inside a table cell.',
  'For every table, the first row must contain only tableHeader cells with short column labels. Every following row must contain only tableCell cells, use the exact same number of cells as the header row, and must not contain blank leading or trailing cells.',
  'For ingredient, material, or composition tables, use exactly two columns named Ingredient and Description. Put material names such as Cotton or Polyester under Ingredient, and explanatory copy under Description.',
  'For pricing tables, return a single header row and one body row per tier. Every table cell must contain at least one paragraph with text.',
  'Always return at least one meaningful top-level block in content.',
  'Prefer concise, production-ready copy. Keep generated content editable and avoid unsupported custom node types.',
  'Return ONLY the raw JSON object conforming to the schema. Do not include markdown code blocks, conversational text, or explanations. The output must be ready for immediate PostgreSQL JSONB insertion.',
].join(' ');
}

function buildGenerationPrompt(params: GenerateEditorBlocksRequest) {
  return [
    'Generate a Tiptap JSON document for this editor request:',
    params.prompt,
    getRequiredNodeTypeForPrompt(params.prompt)
      ? [
          'Table layout requirements:',
          '- Keep normal descriptive prose outside the table as top-level paragraph or heading nodes.',
          '- The first table row is headers only.',
          '- Body rows must align under those headers with no shifted or empty cells.',
        ].join('\n')
      : null,
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

  if (isOpenRouterRecoverableRoutingError(error)) {
    return true;
  }

  if (statusCode && statusCode >= 500) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /NoObjectGenerated|No object generated|NoContentGenerated|No content generated|could not parse|Invalid JSON response|Provider returned error|TypeValidation|JSONParse|response_format|schema|required editor node|generated table|No endpoints found|aborted|abort|timeout|timed out/i.test(
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

function isStandaloneTablePrompt(prompt: string) {
  if (!getRequiredNodeTypeForPrompt(prompt)) {
    return false;
  }

  return !/\b(also|and|description|descriptive|detail|detailed|copy|content|paragraph|section|write|expand|exaggerated|long[-\s]?form|article)\b/i.test(
    prompt
  );
}

function getMinimumTableRowsForPrompt(prompt: string) {
  const tierMatch = prompt.match(/\b(\d+|three|four|five)[-\s]?tier\b/i);

  if (!tierMatch) {
    if (/\b(ingredient|ingredients|material|materials|composition|fabric|cotton|polyester)\b/i.test(prompt)) {
      return 3;
    }

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

type JsonNode = {
  attrs?: Record<string, unknown>;
  content?: unknown;
  text?: unknown;
  type?: unknown;
};

function getContentArray(node: unknown) {
  return node && typeof node === 'object' && Array.isArray((node as JsonNode).content)
    ? ((node as JsonNode).content as unknown[])
    : [];
}

function collectNodesByType(node: unknown, type: string): JsonNode[] {
  if (!node || typeof node !== 'object') {
    return [];
  }

  const record = node as JsonNode;
  const matches = record.type === type ? [record] : [];
  return matches.concat(getContentArray(record).flatMap((child) => collectNodesByType(child, type)));
}

function getNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const record = node as JsonNode;
  const ownText = typeof record.text === 'string' ? record.text : '';
  const childText = getContentArray(record).map(getNodeText).join(' ');

  return [ownText, childText]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertGeneratedTablesAreWellFormed(
  document: EditorBlockDocument,
  params: { minColumns: number; minRows: number }
) {
  const tables = collectNodesByType(document, 'table');

  if (tables.length === 0) {
    throw new Error('Generated document did not include required editor node: table');
  }

  for (const table of tables) {
    const rows = getContentArray(table);

    if (rows.length < params.minRows) {
      throw new Error(`Generated table had fewer than ${params.minRows} rows.`);
    }

    const headerCells = getContentArray(rows[0]);
    const columnCount = headerCells.length;

    if (columnCount < params.minColumns) {
      throw new Error(`Generated table had fewer than ${params.minColumns} columns.`);
    }

    if (!headerCells.every((cell) => (cell as JsonNode)?.type === 'tableHeader')) {
      throw new Error('Generated table header row must contain only tableHeader cells.');
    }

    for (const headerCell of headerCells) {
      const headerText = getNodeText(headerCell);

      if (!headerText) {
        throw new Error('Generated table contained a blank header cell.');
      }

      if (headerText.length > 80 || /[.!?]\s+\S/.test(headerText)) {
        throw new Error('Generated table header cells must be short column labels, not body copy.');
      }
    }

    for (const row of rows.slice(1)) {
      const cells = getContentArray(row);

      if (cells.length !== columnCount) {
        throw new Error('Generated table body rows must match the header column count.');
      }

      if (!cells.every((cell) => (cell as JsonNode)?.type === 'tableCell')) {
        throw new Error('Generated table body rows must contain only tableCell cells.');
      }

      if (cells.some((cell) => !getNodeText(cell))) {
        throw new Error('Generated table contained a blank body cell.');
      }
    }
  }
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
    createEditorGeneratedMixedTableDocumentSchema,
    editorBlockDocumentSchema,
    editorGeneratedBlockDocumentSchema,
    getEditorBlocksSchemaAwarenessString,
  } = loadEditorBlockSchemas();
  const requiredNodeType = getRequiredNodeTypeForPrompt(request.prompt);
  const tableConstraints = requiredNodeType === 'table'
    ? {
        minColumns: getMinimumTableColumnsForPrompt(request.prompt),
        minRows: getMinimumTableRowsForPrompt(request.prompt),
      }
    : null;
  const outputSchema =
    tableConstraints && isStandaloneTablePrompt(request.prompt)
      ? createEditorGeneratedTableDocumentSchema(tableConstraints)
      : tableConstraints
        ? createEditorGeneratedMixedTableDocumentSchema(tableConstraints)
      : editorGeneratedBlockDocumentSchema;
  const routingPolicy = buildCortexAiRoutingPolicy({
    credentialSource: client.credentialSource,
    fallbackModelIds,
    requestedModelId: modelId,
    selectedModel: client.modelSelection,
  });

  const generation = await runWithCortexAiModelFallback({
    modelIds: routingPolicy.modelIds,
    shouldRetry: isRecoverableStructuredGenerationError,
    execute: async (attemptModelId) => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(
        () => abortController.abort(),
        CORTEX_AI_BLOCK_GENERATION_ATTEMPT_TIMEOUT_MS
      );

      try {
        const attemptOptions = omitUnsupportedCortexAiModelOptions(
          {
            abortSignal: abortController.signal,
            maxOutputTokens: 5000,
            maxRetries: 0,
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
          } as Record<string, unknown>,
          {
            modelId: attemptModelId,
            modelSelection: routingPolicy.modelSelection,
          }
        );

        const result = await generateObject({
          ...attemptOptions,
          model: client.model(attemptModelId),
        } as Parameters<typeof generateObject>[0]);

        const document = outputSchema.parse(result.object);
        const validatedDocument = editorBlockDocumentSchema.parse(document);

        if (requiredNodeType && !containsNodeType(validatedDocument, requiredNodeType)) {
          throw new Error(`Generated document did not include required editor node: ${requiredNodeType}`);
        }

        if (tableConstraints) {
          assertGeneratedTablesAreWellFormed(validatedDocument, tableConstraints);
        }

        return validatedDocument;
      } finally {
        clearTimeout(timeoutId);
      }
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
