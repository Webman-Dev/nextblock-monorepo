import { stepCountIs, streamText } from 'ai';
import { NextResponse } from 'next/server';

import {
  createClient,
  getServiceRoleSupabaseClient,
  verifyPackageOnline,
} from '@nextblock-cms/db/server';
import {
  buildCortexAiRoutingPolicy,
  buildVisibleContactIntroActionPlan,
  cortexAiPageContextSchema,
  createCortexGlobalAgentTools,
  createCortexAiOpenRouterClient,
  executeCmsActionPlan,
  executeCreateCmsPage,
  executeCreateCmsPost,
  executeCreateCmsProduct,
  executeDatabaseActionPlan,
  executeDatabaseMutation,
  executeDeleteCmsItem,
  executeDeleteCustomBlock,
  executeInsertContentBlock,
  executeUpdateContentBlock,
  executeUpdateCmsItemField,
  executeUpdateCurrentCmsFields,
  executeUpdateFooter,
  executeUpdateNavigationBar,
  executeUpdateSectionColumnBlock,
  isOpenRouterRateLimitError,
  omitUnsupportedCortexAiModelOptions,
  safeParseCortexAiModelSelection,
  summarizeCortexAiRoutingError,
  type CortexAiPageContext,
  z,
} from '@nextblock-cms/cortex';
import { validateBlockContent } from '../../../../lib/blocks/blockRegistry';

export const dynamic = 'force-dynamic';

const GLOBAL_AGENT_MODEL_ATTEMPT_TIMEOUT_MS = 30000;

const globalAgentMessageSchema = z.strictObject({
  content: z.string().min(1).max(8000),
  role: z.enum(['system', 'user', 'assistant']),
});

const confirmedToolCallSchema = z.strictObject({
  confirmationPhrase: z.string().min(1).max(500),
  input: z.unknown(),
  toolName: z.enum([
    'create_cms_page',
    'create_cms_post',
    'create_cms_product',
    'delete_cms_item',
    'delete_custom_block',
    'execute_database_action_plan',
    'execute_database_mutation',
    'execute_cms_action_plan',
    'insert_content_block',
    'update_cms_item_field',
    'update_content_block',
    'update_current_cms_fields',
    'update_footer',
    'update_navigation_bar',
    'update_section_column_block',
  ]),
});

const globalAgentRequestSchema = z.strictObject({
  confirmedToolCall: confirmedToolCallSchema.optional(),
  messages: z.array(globalAgentMessageSchema).min(1).max(40),
  pageContext: cortexAiPageContextSchema.nullable().optional(),
});

const GLOBAL_AGENT_SYSTEM_PROMPT = [
  'You are NextBlock Cortex AI, the global dashboard agent for a block-based CMS.',
  'Operate as a Planner, Executor, and Evaluator.',
  'Plan the smallest safe change, execute only through typed tools, evaluate the tool result, then answer concisely.',
  'If the user asks for multiple CMS mutations in one prompt, such as creating a page and adding a navigation link, use execute_cms_action_plan so the user sees one combined confirmation and one Confirm button. The action plan must include every requested mutation; do not fall back to confirming only the first task.',
  'For execute_cms_action_plan, actions must be JSON objects, for example { "tool": "create_cms_page", "input": { "title": "Contact Us" } }, never strings like create_cms_page(...).',
  'Every mutating tool is confirmed two-step. First call the right tool with the exact normalized payload. If the tool returns requiresConfirmation, do not say the work is done; say "Please confirm for me to complete:" and summarize the requested change. Do not print confirmationPhrase unless the user explicitly asks for the raw phrase.',
  'When the latest user message is an exact confirmation phrase, call the same mutating tool again with the same payload so the tool can execute. Only report success after the tool result has mutationExecuted=true.',
  'Use create_cms_page, create_cms_post, and create_cms_product for CMS creation. New pages, posts, and products default to draft unless the user explicitly asks for a public/active status.',
  'Use update_cms_item_field for one precise field update at a time, such as price, stock, sale_price, title, slug, status, or SEO metadata. Interpret "public" as published for pages/posts and active for products.',
  'Use prepare_delete_cms_item or delete_cms_item for delete requests. Do not delete anything until the user sends the exact confirmation phrase returned by the tool.',
  'If a user asks for sale start/end dates or scheduled specials, explain that scheduled specials are not supported by the current schema; you may offer to set or clear sale_price only.',
  'Use update_navigation_bar for public header navigation changes. For requests that ask to add a header link, use update_navigation_bar with mode "append" unless the user clearly asks to replace the whole menu.',
  'For requests that ask to rename or change one existing navigation link, use update_navigation_bar with mode "update" and identify the existing item with match.label or match.url. Never use mode "replace" for a one-link rename.',
  'Use mode "replace" only when the user explicitly asks to rebuild or replace the entire navigation menu and you provide the full menu.',
  'Use update_footer for public footer links or copyright settings.',
  'For custom/reusable block types (a "custom block", "block type", "widget", or a request to design a new kind of block such as a product card, testimonial, or feature card), use the global custom block tools, which do NOT need an open page/post/product: create_custom_block to build a new block from a description, update_custom_block to edit one by slug, delete_custom_block to remove one, and list_custom_blocks to find a slug. Never tell the user to open a page first for these; never use insert_content_block or page-aware tools to define a new block type. create_custom_block and update_custom_block run immediately; after success, tell the user the block was added to their Custom Blocks library and can now be dropped onto any page.',
  'Distinguish adding content to the current page (page-aware tools, needs page context) from defining a reusable block type (custom block tools, global, no page context).',
  'When editing a CMS page, post, product, or block, use page-aware tools only. Use read_current_cms_item before updating content unless the user provided exact field/block data.',
  'Use update_current_cms_fields for current page/post/product metadata and product description_json. Use update_content_block for top-level page/post blocks. Use update_section_column_block for nested blocks inside section or hero blocks.',
  'When the user asks to add a visible title, heading, intro, description, or copy above/below a form or other block, use insert_content_block with a text or heading block. Do not treat visible page copy as meta_title, meta_description, or SEO metadata unless the user explicitly says SEO/meta.',
  'For requests like "add a title and description to both pages and incite them to contact us", use execute_cms_action_plan with one insert_content_block action per translated page, usually a text block before the form with localized heading and paragraph HTML.',
  'Do not use update_section_column_block to change an existing nested block from one block type to another. That tool edits only the content of the existing nested block type.',
  'When the user asks to add a new nested block inside a hero or section, such as adding a button to a hero, use update_content_block on the parent hero/section block. Prefer content.append_block, for example { block_type: "button", content: { text: "Contact Us", url: "/contact" } }, so the tool preserves existing column_blocks and layout fields.',
  'When a user names a language, pass that language name or its locale code in languageCode; examples: French maps to fr, English maps to en.',
  'For follow-up requests like "also add it in French", use the prior requested item and apply it to the named language. For page/post/product translations, pass the current translationGroupId into the creation tool so the backend links the language versions.',
  'Use search_documentation before answering implementation or CMS usage questions that require factual project context.',
  'Use describe_database_schema, read_database_records, execute_database_mutation, and execute_database_action_plan for direct database tasks that are not covered by a more specific CMS tool. Use typed CRUD tools only; never ask for or invent raw SQL.',
  'For direct database mutations, always return the confirmation preview first. Never claim a database mutation is complete until the confirmed tool result has mutationExecuted=true. Do not edit auth users, profiles, user addresses, password fields, API keys, tokens, secrets, private keys, credentials, or the cortex_ai_openrouter_api_key site setting.',
  'Use fetch_ecommerce_stats for quantitative questions about revenue, products, or order counts. This tool is read-only.',
  'For order-status questions like "how many pending orders" or "how many trial orders", use the tool result report.matchingOrderStatus or report.orderStatusCounts, and use all_time unless the user names a specific time period.',
  'Never invent database fields, raw SQL, markdown content, or unsupported tool arguments.',
].join(' ');

type CortexAgentStreamEvent =
  | {
      credentialSource: string;
      modelId: string;
      type: 'meta';
    }
  | {
      text: string;
      type: 'text-delta';
    }
  | {
      input?: unknown;
      toolCallId?: string;
      toolName: string;
      type: 'tool-call';
    }
  | {
      output?: unknown;
      toolCallId?: string;
      toolName: string;
      type: 'tool-result';
    }
  | {
      message: string;
      toolCallId?: string;
      toolName?: string;
      type: 'tool-error';
    }
  | {
      message: string;
      type: 'error';
    }
  | {
      type: 'finish';
    };

type CortexAgentStreamPart = {
  error?: unknown;
  id?: string;
  input?: unknown;
  output?: unknown;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  type: string;
};

async function requireAdminAccess() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return !profileError && profile?.role === 'ADMIN' ? { userId: user.id } : null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const encoder = new TextEncoder();

function encodeStreamEvent(event: CortexAgentStreamEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function formatPageContextForPrompt(pageContext: CortexAiPageContext | null | undefined) {
  if (!pageContext) {
    return 'No current CMS edit context was supplied. Ask the user to open the relevant edit screen before using page-aware editing tools.';
  }

  return [
    `Current CMS edit context: contentType=${pageContext.contentType}`,
    `entityId=${String(pageContext.entityId)}`,
    pageContext.slug ? `slug=${pageContext.slug}` : null,
    pageContext.title ? `title=${pageContext.title}` : null,
    pageContext.translationGroupId ? `translationGroupId=${pageContext.translationGroupId}` : null,
    pageContext.languageId ? `languageId=${pageContext.languageId}` : null,
    pageContext.currentEditor?.field ? `currentField=${pageContext.currentEditor.field}` : null,
    pageContext.currentEditor?.blockId ? `currentBlockId=${pageContext.currentEditor.blockId}` : null,
    pageContext.currentEditor?.blockType ? `currentBlockType=${pageContext.currentEditor.blockType}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

function buildGlobalAgentSystemPrompt(pageContext: CortexAiPageContext | null | undefined) {
  return [
    GLOBAL_AGENT_SYSTEM_PROMPT,
    formatPageContextForPrompt(pageContext),
    'When the user says "this page", "this post", "this product", "this field", or "this block", interpret that through the supplied current CMS edit context.',
    'Do not update content outside the supplied current CMS context.',
  ].join(' ');
}

function serializeStreamError(error: unknown) {
  return summarizeCortexAiRoutingError(
    error,
    error instanceof Error ? error.message : 'Cortex AI global agent failed.'
  );
}

function getToolCallId(part: CortexAgentStreamPart) {
  return part.toolCallId || part.id;
}

function looksLikeRawToolCallLeak(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('<toolcall') ||
    normalized.includes('</toolcall') ||
    normalized.includes('"arguments"') ||
    normalized.includes('"update_navigation_bar"') ||
    normalized.includes('"update_footer"') ||
    normalized.includes('"search_documentation"') ||
    normalized.includes('"read_current_cms_item"') ||
    normalized.includes('"update_current_cms_fields"') ||
    normalized.includes('"update_cms_item_field"') ||
    normalized.includes('"update_content_block"') ||
    normalized.includes('"insert_content_block"') ||
    normalized.includes('"update_section_column_block"') ||
    normalized.includes('"create_cms_page"') ||
    normalized.includes('"create_cms_post"') ||
    normalized.includes('"create_cms_product"') ||
    normalized.includes('"execute_cms_action_plan"') ||
    normalized.includes('"prepare_delete_cms_item"') ||
    normalized.includes('"delete_cms_item"')
  );
}

function looksLikeRateLimitText(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('rate limit exceeded') ||
    normalized.includes('free-models-per-day') ||
    normalized.includes('too many requests')
  );
}

function readNumberField(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return null;
  }

  const parsed = Number((value as Record<string, unknown>)[key]);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readStringField(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[key];

  return typeof fieldValue === 'string' ? fieldValue : null;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getConfirmationSummary(toolName?: string, output?: unknown) {
  if (!isRecord(output) || !isRecord(output.preview)) {
    return 'Complete the requested CMS change.';
  }

  const preview = output.preview;
  const summary = readStringField(preview, 'summary');

  if (summary) {
    const actionSummaries = Array.isArray(preview.actionSummaries)
      ? preview.actionSummaries.filter((item): item is string => typeof item === 'string')
      : [];

    return actionSummaries.length > 0
      ? `${summary}\n\n${actionSummaries.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
      : summary;
  }

  const title = readStringField(preview, 'title');
  const slug = readStringField(preview, 'slug');
  const status = readStringField(preview, 'status');
  const contentType = readStringField(preview, 'contentType');
  const field = readStringField(preview, 'field');
  const mode = readStringField(preview, 'mode');
  const languageCode = readStringField(preview, 'languageCode');
  const blockCount = readNumberField(preview, 'blockCount');
  const itemCount = readNumberField(preview, 'itemCount');
  const affectedCount = readNumberField(preview, 'affectedCount');

  if (toolName === 'create_cms_page' || toolName === 'create_cms_post') {
    return `Create ${status || 'draft'} ${toolName === 'create_cms_page' ? 'page' : 'post'} "${title || slug || 'Untitled'}"${slug ? ` at slug "${slug}"` : ''}${blockCount !== null ? ` with ${pluralize(blockCount, 'content block')}` : ''}.`;
  }

  if (toolName === 'create_cms_product') {
    return `Create ${status || 'draft'} product "${title || slug || 'Untitled'}"${slug ? ` at slug "${slug}"` : ''}.`;
  }

  if (toolName === 'update_cms_item_field') {
    return `Update ${field || 'one field'} on the ${contentType || 'CMS item'} "${title || slug || 'selected item'}".`;
  }

  if (toolName === 'update_navigation_bar') {
    return `${mode === 'append' ? 'Add' : mode === 'update' ? 'Update' : 'Replace'} ${itemCount !== null ? pluralize(itemCount, 'navigation item') : 'navigation items'} in the ${languageCode || 'selected'} header navigation.`;
  }

  if (toolName === 'update_footer') {
    const linkCount = readNumberField(preview, 'linkCount');
    return `Update the ${languageCode || 'selected'} footer${linkCount !== null ? ` with ${pluralize(linkCount, 'link')}` : ''}.`;
  }

  if (toolName === 'update_content_block') {
    return `Update the selected ${readStringField(preview, 'blockType') || 'content'} block.`;
  }

  if (toolName === 'insert_content_block') {
    return `Insert ${readStringField(preview, 'blockType') || 'content'} block on the ${contentType || 'CMS item'} "${title || slug || 'selected item'}".`;
  }

  if (toolName === 'update_section_column_block') {
    return `Update the selected nested ${readStringField(preview, 'nestedBlockType') || 'section'} block.`;
  }

  if (toolName === 'delete_cms_item' || toolName === 'prepare_delete_cms_item') {
    return `Delete ${affectedCount !== null ? pluralize(affectedCount, contentType || 'CMS item') : `the selected ${contentType || 'CMS item'}`}${title || slug ? ` for "${title || slug}"` : ''}.`;
  }

  return 'Complete the requested CMS change.';
}

function getToolCompletionMessage(toolName?: string, output?: unknown) {
  if (isRecord(output)) {
    if (output.requiresConfirmation === true) {
      return `Please confirm for me to complete:\n\n${getConfirmationSummary(toolName, output)}`;
    }

    if (output.unsupported === true || output.success === false) {
      return readStringField(output, 'message') || 'I could not complete that request.';
    }
  }

  const mutationExecuted = isRecord(output) && output.mutationExecuted === true;

  if (toolName === 'update_navigation_bar') {
    const insertedCount = readNumberField(output, 'insertedCount');
    const skippedCount = readNumberField(output, 'skippedCount');

    if ((insertedCount ?? 0) === 0 && (skippedCount ?? 0) > 0) {
      return 'That navigation link already exists, so I left the header unchanged.';
    }

    return 'Done. I updated the navigation bar.';
  }

  if (toolName === 'update_footer') {
    return 'Done. I updated the footer.';
  }

  if (toolName === 'search_documentation') {
    return 'I searched the documentation, but the model was interrupted before it could finish a summary.';
  }

  if (toolName === 'read_current_cms_item') {
    return 'I read the current CMS item, but the model was interrupted before it could finish a summary.';
  }

  if (toolName === 'fetch_ecommerce_stats') {
    return 'I fetched the latest ecommerce statistics for you.';
  }

  if (toolName === 'describe_database_schema') {
    return 'I inspected the available database schema.';
  }

  if (toolName === 'read_database_records') {
    return 'I read the requested database records.';
  }

  if (toolName === 'execute_database_mutation') {
    const affectedCount = readNumberField(output, 'affectedCount');
    const table = readStringField(output, 'table');
    const auditLogged = isRecord(output) && output.auditLogged === true;

    return mutationExecuted
      ? `Done. I updated ${affectedCount ? pluralize(affectedCount, 'database row') : 'the database'}${table ? ` in ${table}` : ''}.${auditLogged ? ' Audit logged.' : ''}`
      : 'I prepared the database mutation.';
  }

  if (toolName === 'execute_database_action_plan') {
    const actionCount = readNumberField(output, 'actionCount');
    const auditLogged = isRecord(output) && output.auditLogged === true;

    return mutationExecuted
      ? `Done. I completed ${actionCount ? pluralize(actionCount, 'database action') : 'the database action plan'}.${auditLogged ? ' Audit logged.' : ''}`
      : 'I prepared the database action plan.';
  }

  if (toolName === 'update_current_cms_fields') {
    return 'Done. I updated the current CMS fields.';
  }

  if (toolName === 'update_cms_item_field') {
    return mutationExecuted
      ? 'Done. I updated that CMS field.'
      : 'I prepared the CMS field update.';
  }

  if (toolName === 'update_content_block') {
    return 'Done. I updated the current content block.';
  }

  if (toolName === 'insert_content_block') {
    return 'Done. I inserted the content block.';
  }

  if (toolName === 'update_section_column_block') {
    return 'Done. I updated the nested section block.';
  }

  if (toolName === 'create_cms_page') {
    return mutationExecuted ? 'Done. I created the page.' : 'I prepared the page creation.';
  }

  if (toolName === 'create_cms_post') {
    return mutationExecuted ? 'Done. I created the post.' : 'I prepared the post creation.';
  }

  if (toolName === 'create_cms_product') {
    return mutationExecuted ? 'Done. I created the product.' : 'I prepared the product creation.';
  }

  if (toolName === 'prepare_delete_cms_item') {
    return getToolCompletionMessage('delete_cms_item', output);
  }

  if (toolName === 'delete_cms_item') {
    return mutationExecuted ? 'Done. I deleted that CMS item.' : 'I prepared the delete request.';
  }

  if (toolName === 'execute_cms_action_plan') {
    const actionCount = readNumberField(output, 'actionCount');

    return mutationExecuted
      ? `Done. I completed ${actionCount ? pluralize(actionCount, 'CMS action') : 'the CMS action plan'}.`
      : 'I prepared the CMS action plan.';
  }

  return 'Done. I completed the requested update.';
}

function completeToolBackedText(text: string, toolName?: string, output?: unknown) {
  const trimmedText = text.trim();

  if (!isRecord(output)) {
    return trimmedText || getToolCompletionMessage(toolName, output);
  }

  if (output.requiresConfirmation === true) {
    return getToolCompletionMessage(toolName, output);
  }

  if ((output.unsupported === true || output.success === false) && !trimmedText) {
    return getToolCompletionMessage(toolName, output);
  }

  return trimmedText || getToolCompletionMessage(toolName, output);
}

async function executeConfirmedToolCall(params: {
  context: Parameters<typeof createCortexGlobalAgentTools>[0];
  input: unknown;
  toolName: z.infer<typeof confirmedToolCallSchema>['toolName'];
}) {
  switch (params.toolName) {
    case 'create_cms_page':
      return executeCreateCmsPage(params.input as any, params.context);
    case 'create_cms_post':
      return executeCreateCmsPost(params.input as any, params.context);
    case 'create_cms_product':
      return executeCreateCmsProduct(params.input as any, params.context);
    case 'delete_cms_item':
      return executeDeleteCmsItem(params.input as any, params.context);
    case 'delete_custom_block':
      return executeDeleteCustomBlock(params.input as any, params.context);
    case 'execute_database_action_plan':
      return executeDatabaseActionPlan(params.input as any, params.context);
    case 'execute_database_mutation':
      return executeDatabaseMutation(params.input as any, params.context);
    case 'execute_cms_action_plan':
      return executeCmsActionPlan(params.input as any, params.context);
    case 'update_cms_item_field':
      return executeUpdateCmsItemField(params.input as any, params.context);
    case 'update_content_block':
      return executeUpdateContentBlock(params.input as any, params.context);
    case 'insert_content_block':
      return executeInsertContentBlock(params.input as any, params.context);
    case 'update_current_cms_fields':
      return executeUpdateCurrentCmsFields(params.input as any, params.context);
    case 'update_footer':
      return executeUpdateFooter(params.input as any, params.context);
    case 'update_navigation_bar':
      return executeUpdateNavigationBar(params.input as any, params.context);
    case 'update_section_column_block':
      return executeUpdateSectionColumnBlock(params.input as any, params.context);
  }
}

function createConfirmedToolCallStream(params: {
  context: Parameters<typeof createCortexGlobalAgentTools>[0];
  input: unknown;
  toolName: z.infer<typeof confirmedToolCallSchema>['toolName'];
}) {
  return new ReadableStream({
    async start(controller) {
      const toolCallId = `confirmed-${Date.now()}`;

      controller.enqueue(
        encodeStreamEvent({
          input: params.input,
          toolCallId,
          toolName: params.toolName,
          type: 'tool-call',
        })
      );

      try {
        const output = await executeConfirmedToolCall(params);

        controller.enqueue(
          encodeStreamEvent({
            output,
            toolCallId,
            toolName: params.toolName,
            type: 'tool-result',
          })
        );
        controller.enqueue(
          encodeStreamEvent({
            text: getToolCompletionMessage(params.toolName, output),
            type: 'text-delta',
          })
        );
      } catch (error) {
        controller.enqueue(
          encodeStreamEvent({
            message: serializeStreamError(error),
            toolCallId,
            toolName: params.toolName,
            type: 'tool-error',
          })
        );
        controller.enqueue(
          encodeStreamEvent({
            message: serializeStreamError(error),
            type: 'error',
          })
        );
      }

      controller.enqueue(encodeStreamEvent({ type: 'finish' }));
      controller.close();
    },
  });
}

function getRetryableStreamError(
  error: unknown,
  sawRawToolCallLeak: boolean,
  sawRateLimitText: boolean
) {
  if (sawRawToolCallLeak) {
    return new Error('OpenRouter returned an invalid raw tool-call payload.');
  }

  if (sawRateLimitText) {
    return new Error('OpenRouter rate limit exceeded.');
  }

  return error;
}

function createAttemptAbortSignal(requestSignal: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Cortex AI response timed out. Please try again.'));
  }, GLOBAL_AGENT_MODEL_ATTEMPT_TIMEOUT_MS);
  const abortFromRequest = () => controller.abort(requestSignal.reason);

  if (requestSignal.aborted) {
    abortFromRequest();
  } else {
    requestSignal.addEventListener('abort', abortFromRequest, { once: true });
  }

  return {
    cleanup: () => {
      clearTimeout(timeoutId);
      requestSignal.removeEventListener('abort', abortFromRequest);
    },
    signal: controller.signal,
  };
}

export async function POST(request: Request) {
  try {
    const adminAccess = await requireAdminAccess();

    if (!adminAccess) {
      return jsonError('You do not have permission to use the global Cortex AI agent.', 403);
    }

    const isCortexAiActive = await verifyPackageOnline('cortex-ai');

    if (!isCortexAiActive) {
      return jsonError('NextBlock Cortex AI is not active for this workspace.', 403);
    }

    const body = await request.json().catch(() => null);
    const parsedRequest = globalAgentRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return jsonError('Invalid Cortex AI global-agent request.', 400);
    }

    const pageContext = parsedRequest.data.pageContext ?? null;
    const latestUserMessage =
      [...parsedRequest.data.messages].reverse().find((message) => message.role === 'user')
        ?.content ?? '';

    if (parsedRequest.data.confirmedToolCall) {
      const confirmedToolCall = parsedRequest.data.confirmedToolCall;
      const stream = createConfirmedToolCallStream({
        context: {
          actorUserId: adminAccess.userId,
          latestUserMessage: confirmedToolCall.confirmationPhrase,
          pageContext,
          supabase: getServiceRoleSupabaseClient(),
          validateBlockContent,
        },
        input: confirmedToolCall.input,
        toolName: confirmedToolCall.toolName,
      });

      return new Response(stream, {
        headers: {
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Content-Type': 'text/event-stream; charset=utf-8',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const directActionPlan = buildVisibleContactIntroActionPlan(latestUserMessage);

    if (directActionPlan) {
      const stream = createConfirmedToolCallStream({
        context: {
          actorUserId: adminAccess.userId,
          latestUserMessage,
          pageContext,
          supabase: getServiceRoleSupabaseClient(),
          validateBlockContent,
        },
        input: directActionPlan,
        toolName: 'execute_cms_action_plan',
      });

      return new Response(stream, {
        headers: {
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Content-Type': 'text/event-stream; charset=utf-8',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const sandboxKey = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true' ? request.headers.get('x-sandbox-openrouter-key') : null;
    const sandboxModelRaw = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true' ? request.headers.get('x-sandbox-openrouter-model') : null;
    
    let modelSelection = null;
    if (sandboxModelRaw) {
      try {
        modelSelection = safeParseCortexAiModelSelection(JSON.parse(sandboxModelRaw));
      } catch {
        // Ignore parse errors from headers
      }
    }

    const client = await createCortexAiOpenRouterClient({
      apiKey: sandboxKey || undefined,
      modelSelection: sandboxKey && modelSelection ? modelSelection : undefined,
    });
    const routingPolicy = buildCortexAiRoutingPolicy({
      credentialSource: client.credentialSource,
      selectedModel: client.modelSelection,
    });
    const modelIds = routingPolicy.modelIds;
    const tools = createCortexGlobalAgentTools({
      actorUserId: adminAccess.userId,
      cortexAiApiKey: sandboxKey,
      cortexAiModelSelection: sandboxKey && modelSelection ? modelSelection : undefined,
      latestUserMessage,
      pageContext,
      supabase: getServiceRoleSupabaseClient(),
      validateBlockContent,
    });
    const systemPrompt = buildGlobalAgentSystemPrompt(pageContext);

    const stream = new ReadableStream({
      async start(controller) {
        let completed = false;
        let lastError: unknown = null;

        for (const [index, modelId] of modelIds.entries()) {
          let textBuffer = '';
          let sawRawToolCallLeak = false;
          let sawRateLimitText = false;
          let hasToolCall = false;
          let hasSuccessfulToolResult = false;
          let lastToolName: string | undefined;
          let lastToolOutput: unknown;

          controller.enqueue(
            encodeStreamEvent({
              credentialSource: client.credentialSource,
              modelId,
              type: 'meta',
            })
          );

          try {
            const attemptAbort = createAttemptAbortSignal(request.signal);
            const attemptOptions = omitUnsupportedCortexAiModelOptions(
              {
                abortSignal: attemptAbort.signal,
                maxOutputTokens: 2000,
                messages: parsedRequest.data.messages,
                maxRetries: 0,
                stopWhen: stepCountIs(6),
                system: systemPrompt,
                temperature: 0.1,
                tools,
              } as Record<string, unknown>,
              {
                modelId,
                modelSelection: routingPolicy.modelSelection,
              }
            );
            const result = streamText({
              ...attemptOptions,
              model: client.model(modelId),
            } as Parameters<typeof streamText>[0]);

            try {
              for await (const rawPart of result.fullStream) {
                const part = rawPart as CortexAgentStreamPart;

                if (part.type === 'text-delta' && part.text) {
                  textBuffer = `${textBuffer}${part.text}`;
                  sawRawToolCallLeak = sawRawToolCallLeak || looksLikeRawToolCallLeak(textBuffer);
                  sawRateLimitText = sawRateLimitText || looksLikeRateLimitText(textBuffer);
                }

                if (part.type === 'tool-call' && part.toolName) {
                  hasToolCall = true;
                  lastToolName = part.toolName;
                  controller.enqueue(
                    encodeStreamEvent({
                      input: part.input,
                      toolCallId: getToolCallId(part),
                      toolName: part.toolName,
                      type: 'tool-call',
                    })
                  );
                }

                if (part.type === 'tool-result' && part.toolName) {
                  hasSuccessfulToolResult = true;
                  lastToolName = part.toolName;
                  lastToolOutput = part.output;
                  controller.enqueue(
                    encodeStreamEvent({
                      output: part.output,
                      toolCallId: getToolCallId(part),
                      toolName: part.toolName,
                      type: 'tool-result',
                    })
                  );
                }

                if (part.type === 'tool-error') {
                  hasToolCall = true;
                  controller.enqueue(
                    encodeStreamEvent({
                      message: serializeStreamError(part.error),
                      toolCallId: getToolCallId(part),
                      toolName: part.toolName,
                      type: 'tool-error',
                    })
                  );
                }

                if (part.type === 'error') {
                  throw part.error || new Error('Cortex AI stream failed.');
                }
              }
            } finally {
              attemptAbort.cleanup();
            }

            if ((sawRawToolCallLeak || sawRateLimitText) && !hasToolCall) {
              lastError = getRetryableStreamError(
                null,
                sawRawToolCallLeak,
                sawRateLimitText
              );

              if (index < modelIds.length - 1) {
                continue;
              }

              throw lastError;
            }

            if ((sawRawToolCallLeak || sawRateLimitText) && !hasSuccessfulToolResult) {
              lastError = getRetryableStreamError(
                null,
                sawRawToolCallLeak,
                sawRateLimitText
              );
              throw lastError;
            }

            if ((sawRawToolCallLeak || sawRateLimitText) && hasSuccessfulToolResult) {
              controller.enqueue(
                encodeStreamEvent({
                  text: getToolCompletionMessage(lastToolName, lastToolOutput),
                  type: 'text-delta',
                })
              );
            } else if (textBuffer.trim() && !looksLikeRawToolCallLeak(textBuffer)) {
              controller.enqueue(
                encodeStreamEvent({
                  text: hasSuccessfulToolResult
                    ? completeToolBackedText(textBuffer, lastToolName, lastToolOutput)
                    : textBuffer,
                  type: 'text-delta',
                })
              );
            } else if (hasSuccessfulToolResult) {
              controller.enqueue(
                encodeStreamEvent({
                  text: getToolCompletionMessage(lastToolName, lastToolOutput),
                  type: 'text-delta',
                })
              );
            }

            controller.enqueue(encodeStreamEvent({ type: 'finish' }));
            completed = true;
            break;
          } catch (error) {
            lastError = getRetryableStreamError(error, sawRawToolCallLeak, sawRateLimitText);

            if (hasSuccessfulToolResult) {
              controller.enqueue(
                encodeStreamEvent({
                  text: completeToolBackedText(textBuffer, lastToolName, lastToolOutput),
                  type: 'text-delta',
                })
              );
              controller.enqueue(encodeStreamEvent({ type: 'finish' }));
              completed = true;
              break;
            }

            if (
              !hasToolCall &&
              isOpenRouterRateLimitError(lastError) &&
              index < modelIds.length - 1
            ) {
              continue;
            }

            if (
              !hasToolCall &&
              (sawRawToolCallLeak || sawRateLimitText) &&
              index < modelIds.length - 1
            ) {
              continue;
            }

            controller.enqueue(
              encodeStreamEvent({
                message: serializeStreamError(lastError),
                type: 'error',
              })
            );
            controller.enqueue(encodeStreamEvent({ type: 'finish' }));
            completed = true;
            break;
          }

          if (completed) {
            break;
          }
        }

        if (!completed) {
          controller.enqueue(
            encodeStreamEvent({
              message: serializeStreamError(lastError),
              type: 'error',
            })
          );
          controller.enqueue(encodeStreamEvent({ type: 'finish' }));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Cortex AI] Global agent failed:', error);
    return jsonError(error instanceof Error ? error.message : 'Global agent failed.', 500);
  }
}
