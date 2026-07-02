# NextBlock Cortex AI Architecture

This document is a handoff and maintenance guide for the current NextBlock Cortex AI implementation. It is intended for future developers and for AI coding agents that need high-fidelity context in a new thread.

Do not copy real API keys, Freemius license keys, encryption secrets, Supabase service keys, or other secret values into this document or into prompts. Only environment variable names are documented here.

## Executive Summary

NextBlock Cortex AI is the premium AI package for NextBlock. Its internal package id is:

```txt
cortex-ai
```

The package currently implements three major capabilities:

1. Premium package activation and BYOK key management.
2. OpenRouter-backed model routing with free-model fallback behavior.
3. AI features inside the CMS:
   - Inline Tiptap rich-text assistance that generates clean HTML fragments and lets the editor parse them normally.
   - A page-aware global dashboard agent that can update navigation/footer state, search CMS documentation-like content, and mutate current page/post/product fields or blocks through typed tools.

The implementation now splits editing responsibilities:

- The inline editor path is HTML-first and intentionally lightweight. It is for rich-text fragments inside the active Tiptap document, not full CMS block generation.
- Full page, product, post, section, and block editing goes through the global agent and strict Zod tool arguments.
- Existing editor JSON schemas remain important for stored product `description_json`, schema diagnostics, and global-agent field validation.
- Server-side key handling is isolated in server-only modules.
- Database writes happen through authenticated server actions or service-role Supabase calls, not client-side mutation.

## Current Status

Implemented:

- Package registry entry for `cortex-ai`.
- Freemius product/plan metadata:
  - `fm_product_id`: `28609`
  - `fm_plan_id`: `47122`
- Sandbox reset auto-activates Cortex AI when `FREEMIUS_AI_SANDBOX_KEY` is present.
- Encrypted OpenRouter BYOK storage in `site_settings`.
- RLS hardening so `site_settings.key = 'cortex_ai_openrouter_api_key'` is not publicly readable.
- Cortex AI settings page under `/cms/settings/cortex-ai`.
- OpenRouter client, free-model fallback registry, and stored-BYOK paid model selection.
- Tiptap editor JSON schemas and schema-to-JSON-schema helper.
- `/api/ai/generate-blocks` endpoint for inline HTML fragment generation.
- Editor prompt UI in `NotionEditor`.
- `/api/ai/global-agent` endpoint with page context, tool calling, and SSE streaming.
- Persistent dashboard chat UI with local browser chat threads.
- Tools for:
  - `update_navigation_bar`
  - `update_footer`
  - `search_documentation`
  - `read_current_cms_item`
  - `update_current_cms_fields`
  - `update_content_block`
  - `update_section_column_block`
  - `fetch_ecommerce_stats`
- Multilingual navigation/footer tool arguments using either language codes or language names.
- Guardrails against OpenRouter free-model rate limits, raw tool-call leakage, and stuck loading streams.
- Custom-block "build widget" generation: `/api/ai/cortex/build-widget` and the custom-block agent tools (`libs/cortex/src/lib/ai-global-agent-custom-block-tools.ts`) produce data-driven `custom_block_definitions` from a prompt. See [10-CUSTOM-BLOCKS.md](./10-CUSTOM-BLOCKS.md) for the block model.

Known incomplete or future work:

- Footer link updates currently replace footer links for the selected locale. Footer append mode is not yet implemented.
- Documentation search is keyword/scored search over `posts` and `pages`, not a vector embedding RAG system yet.
- The sandbox should eventually seed a visible product/package item for Cortex AI, similar to ecommerce. The preferred image asset is `apps/nextblock/public/images/cortex-ai-square.webp`.
- Block insertion is intentionally left for a follow-up pass with explicit idempotency keys.

## Important Files

### Package and Environment

| File | Purpose |
| --- | --- |
| `libs/utils/src/lib/nextblock-packages.ts` | Package registry. Contains `cortex-ai` metadata and Freemius product/plan ids. |
| `libs/cortex/src/lib/ai-config.ts` | Server-only Cortex AI constants and environment accessors. |
| `libs/cortex/src/lib/ai-key-crypto.ts` | AES-256-GCM encryption/decryption helpers for stored OpenRouter BYOK keys. |
| `.env.exemple` | Documents `FREEMIUS_AI_SANDBOX_KEY`, `OPENROUTER_API_KEY`, and `CORTEX_AI_ENCRYPTION_KEY`. |
| `libs/environment.d.ts` | Type declarations for Cortex AI environment variables. |

### Database and Sandbox

| File | Purpose |
| --- | --- |
| `libs/db/src/supabase/migrations/00000000000011_setup_cortex_ai_settings.sql` | RLS hardening for the sensitive `site_settings` Cortex AI key row. |
| `apps/nextblock/app/api/cron/reset-sandbox/route.ts` | Sandbox reset route. Upserts active package activation for `cortex-ai` when `FREEMIUS_AI_SANDBOX_KEY` exists. |
| `apps/nextblock/app/api/cron/reset-sandbox/sandboxResetSql.ts` | Generated SQL bundle that includes the Cortex AI migration. |

### Routing and OpenRouter

| File | Purpose |
| --- | --- |
| `libs/cortex/src/lib/ai-client.ts` | Creates OpenRouter provider/client with credential resolution and text-generation helper. |
| `libs/cortex/src/lib/ai-model-catalog.ts` | Server-only OpenRouter model catalog fetcher. |
| `libs/cortex/src/lib/ai-model-registry.ts` | Free model registry, routing policy builder, model filtering/parsing helpers, rate-limit detection, fallback runner. |
| `apps/nextblock/scripts/verify-cortex-ai-routing.ts` | Manual verification script for OpenRouter routing. |

### Inline Editor Assistance

| File | Purpose |
| --- | --- |
| `libs/utils/src/lib/editor-blocks.ts` | Main Tiptap JSON Zod schemas, allowed node/mark types, JSON Schema extraction. Still used for product descriptions and agent validation. |
| `schemas/editor-blocks.ts` | Re-export shim for schema imports from app scripts/lib code. |
| `libs/cortex/src/lib/ai-block-generation.ts` | Inline editor HTML-fragment generation using `generateText`, routing fallback, and lightweight output validation. |
| `apps/nextblock/app/api/ai/generate-blocks/route.ts` | Compatibility route for inline editor generation. Returns `{ html, credentialSource, modelId }`. |
| `libs/editor/src/lib/NotionEditor.tsx` | Editor prompt UI and HTML insertion behavior via normal Tiptap parsing. |
| `apps/nextblock/scripts/validate-editor-block-schema.ts` | Validates editor schema against sample content and emits diagnostics. |
| `apps/nextblock/scripts/verify-cortex-ai-generate-blocks.ts` | Manual live generation verification script. |

### Global Agent

| File | Purpose |
| --- | --- |
| `libs/cortex/src/lib/ai-global-agent-tools.ts` | Tool schemas and execution functions. |
| `apps/nextblock/app/api/ai/global-agent/route.ts` | Global agent route and SSE streaming orchestration. |
| `apps/nextblock/app/cms/components/CortexGlobalAgentChat.tsx` | Persistent dashboard chat UI with thread history. |
| `apps/nextblock/app/cms/components/CortexAiPageContext.tsx` | Client page-context provider/registrar used by CMS edit screens and the global chat. |
| `libs/cortex/src/lib/ai-global-agent-tools.test.ts` | Unit tests for tool executors. |
| `apps/nextblock/scripts/verify-cortex-ai-global-tools.ts` | Focused verifier for global tools. |

### CMS Integration

| File | Purpose |
| --- | --- |
| `apps/nextblock/app/cms/layout.tsx` | Server layout checks package activation for ecommerce and Cortex AI. |
| `apps/nextblock/app/cms/CmsClientLayout.tsx` | Adds Cortex AI settings nav item, wraps CMS in the page-context provider, and conditionally renders global chat. |
| `apps/nextblock/app/cms/settings/cortex-ai/page.tsx` | Settings page for activation/key status, BYOK forms, and compatible model selection. |
| `apps/nextblock/app/cms/settings/cortex-ai/actions.ts` | Server actions for reading, saving, and clearing BYOK keys and model selections. |
| `apps/nextblock/app/cms/dashboard/actions.ts` | Dashboard package state; checks `cortex-ai` to hide/show AI premium CTA. |
| `apps/nextblock/components/Header.tsx` and `apps/nextblock/components/ResponsiveNav.tsx` | Hydration-safe public header controls after Radix ID mismatch fixes. |
| `apps/nextblock/app/cms/components/FeedbackModal.tsx` | Hydration-safe feedback dialog trigger. |

## Package Activation

The package id is `cortex-ai`. Do not use the old id `ai`.

The package registry entry lives in `libs/utils/src/lib/nextblock-packages.ts`:

```ts
'cortex-ai': {
  id: 'cortex-ai',
  name: 'NextBlock Cortex AI',
  description: 'Native JSONB block generation and OpenRouter integration.',
  fm_product_id: '28609',
  fm_plan_id: '47122',
  purchase_url: 'https://nextblock.dev',
}
```

Activation checks use:

```ts
verifyPackageOnline('cortex-ai')
```

Current usage:

- CMS layout gates the chat with `verifyPackageOnline('cortex-ai')`.
- Settings page reports package active/inactive.
- Global agent route rejects requests if Cortex AI is inactive.
- Dashboard premium CTA checks `stats.isAiActive`, now derived from active package id `cortex-ai`.

## Environment Variables

Environment variables are documented in `.env.exemple` and typed in `libs/environment.d.ts`.

```txt
FREEMIUS_AI_SANDBOX_KEY=
OPENROUTER_API_KEY=
CORTEX_AI_ENCRYPTION_KEY=
```

### FREEMIUS_AI_SANDBOX_KEY

Used only for sandbox activation.

If present during sandbox reset, `apps/nextblock/app/api/cron/reset-sandbox/route.ts` upserts an active `package_activations` row:

```txt
package_id = cortex-ai
license_key = FREEMIUS_AI_SANDBOX_KEY
status = active
```

The upsert uses `onConflict: 'license_key, package_id'` to avoid duplicate reset failures.

### OPENROUTER_API_KEY

Server-side OpenRouter key used for sandbox-safe free-model routing when no stored BYOK exists.

Credential priority is:

1. Manual API key passed to helper functions, used mainly in tests/scripts.
2. Encrypted key stored in `site_settings`.
3. `OPENROUTER_API_KEY`.
4. No credential, which throws an error.

Stored BYOK intentionally takes precedence over `OPENROUTER_API_KEY`. This lets admins keep a sandbox/free environment key in `.env.local` while enabling paid compatible model selection only after they save a stored BYOK in the CMS.

Important: `openrouter/free` is a free model-router id, not a replacement for authentication. The app still needs an OpenRouter API key from either the environment or stored BYOK.

When the active credential source is `env`, Cortex AI always routes through exactly the configured `CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY` list. Non-free explicit model requests are ignored for env-only routing.

**Sandbox Behavior:** When `NEXT_PUBLIC_IS_SANDBOX=true`, the server environments won't save any OpenRouter key or model selection to the database. The user will be requested to input a key that is stored purely in their browser's `localStorage` (`cortex_ai_sandbox_openrouter_api_key`) with browser-local model selection (`cortex_ai_sandbox_openrouter_model_selection`). The inline editor and global chat pass those values as request headers (`x-sandbox-openrouter-key` and `x-sandbox-openrouter-model`) for the user's own request only.

OpenRouter free models can still hit free-model rate limits. A user with no credits or no credit card can see errors like `free-models-per-day`. Cortex AI catches these where possible and falls back to configured alternate models, but OpenRouter account-level limits may still block all free requests.

### CORTEX_AI_ENCRYPTION_KEY

Required only for saving/decrypting DB-stored BYOK keys.

Implementation detail:

- `libs/cortex/src/lib/ai-key-crypto.ts` hashes this secret with SHA-256 to derive a 32-byte AES key.
- Stored keys use AES-256-GCM with a 12-byte random IV and auth tag.
- Changing this value invalidates previously encrypted stored keys.

Recommended value shape:

- Long random string.
- At least 32 characters.
- Do not commit it.
- Keep the same value for an environment as long as stored keys need to remain decryptable.

## BYOK Storage and RLS

Stored OpenRouter keys are saved in:

```txt
public.site_settings.key = cortex_ai_openrouter_api_key
```

The value is a JSON envelope:

```ts
{
  algorithm: 'aes-256-gcm',
  authTag: string,
  ciphertext: string,
  iv: string,
  last4: string,
  updatedAt: string,
  version: 1
}
```

The migration `00000000000011_setup_cortex_ai_settings.sql` hardens RLS:

- Public users can read non-sensitive site settings.
- The sensitive Cortex AI key row is readable only by authenticated admins.
- The sensitive row is writable/deletable only by authenticated admins.
- Existing non-sensitive site settings remain writable by current `ADMIN`/`WRITER` policy.

Stored model selection is saved separately in:

```txt
public.site_settings.key = cortex_ai_openrouter_model_selection
```

The value is not secret and uses this shape:

```ts
{
  modelId: string,
  name: string,
  supportedParameters: string[],
  pricing: Record<string, string>,
  contextLength: number | null,
  updatedAt: string
}
```

The selection is only honored when a stored BYOK exists. Clearing the stored BYOK also clears the selected model. Model selection does not require a database migration because `site_settings` is already the platform key/value store and this row is non-sensitive.

Settings UI behavior:

- Page: `/cms/settings/cortex-ai`.
- Server actions re-check authenticated user role as `ADMIN`.
- Stored BYOK is never displayed in plaintext.
- The UI only shows masked `**** last4` status.
- If only `OPENROUTER_API_KEY` exists, UI states that env routing is locked to the three free models.
- If stored BYOK exists, UI fetches compatible OpenRouter text models that support `tools` and `structured_outputs`, then allows an admin to save one selected model.
- If `NEXT_PUBLIC_IS_SANDBOX=true`, the UI uses a client component to save keys and model selection purely to `localStorage`, and bypasses the database to prevent accidental key leaks across a shared sandbox environment.

## OpenRouter Client Architecture

The OpenRouter client is implemented in `libs/cortex/src/lib/ai-client.ts`.

It uses:

```ts
createOpenAICompatible
```

from `@ai-sdk/openai-compatible`, with:

```txt
baseURL = https://openrouter.ai/api/v1
name = openrouter
supportsStructuredOutputs = true
includeUsage = true
```

Custom OpenRouter headers:

```txt
HTTP-Referer = NEXT_PUBLIC_URL or https://nextblock.dev
X-Title = NextBlock Cortex AI
```

Credential resolution is:

```txt
manual -> stored BYOK -> OPENROUTER_API_KEY -> none
```

When the resolved source is `stored`, the client also reads `cortex_ai_openrouter_model_selection` and exposes it to the routing policy. When the source is `env`, model selection is ignored and the policy locks requests to the free registry.

All AI client/config modules intentionally throw if imported into browser code:

```ts
if (typeof window !== 'undefined') {
  throw new Error(...)
}
```

This prevents accidental client-side exposure of secrets.

## Model Registry and Fallback

The model registry lives in `libs/cortex/src/lib/ai-model-registry.ts`.

Default free router constant:

```txt
openrouter/free
```

This constant is retained for compatibility, but Cortex AI's preferred generation and agent model chains use explicit free models that advertise both `structured_outputs` and tool-calling support.

Configured all-purpose free fallbacks:

```txt
qwen/qwen3-next-80b-a3b-instruct:free
nvidia/nemotron-3-super-120b-a12b:free
nvidia/nemotron-nano-9b-v2:free
```

Registries:

- `structuredJsonPreferred`: retained for compatibility with older structured-generation code paths and schema diagnostics.
- `toolCallingPreferred`: retained as the global-agent free default list.

Both registries intentionally use the same model list. The inline editor no longer depends on model-native structured JSON output, but current paid model selection still requires `tools` and `structured_outputs` because the global agent needs tool calling and existing schema utilities still validate structured editor documents.

Paid model selection:

- `CORTEX_AI_REQUIRED_MODEL_PARAMETERS = ['tools', 'structured_outputs']`.
- `libs/cortex/src/lib/ai-model-catalog.ts` fetches `https://openrouter.ai/api/v1/models?supported_parameters=tools,structured_outputs&output_modalities=text`.
- Catalog filtering keeps only non-expired text-output models that advertise all required parameters.
- `buildCortexAiRoutingPolicy` is the single policy entrypoint for inline editor generation, global agent routing, and shared text generation.
- Env-key routing always returns exactly the free fallback registry.
- Stored-BYOK routing returns `[selectedModel, ...freeFallbacks]` when a selected compatible model exists, otherwise it returns the free fallback registry.
- Manual-key routing can use a requested model id, mainly for tests and scripts.
- Optional request parameters such as `temperature` are stripped for the selected stored model if its saved `supportedParameters` metadata does not include that parameter.

Fallback behavior:

- `runWithCortexAiModelFallback` deduplicates model ids.
- Default retry condition is OpenRouter HTTP 429.
- Inline HTML generation overrides the retry predicate to also retry recoverable empty/invalid fragment, provider, timeout, and 5xx errors.
- 401/402/403 are treated as non-recoverable for inline generation.
- Routing errors are summarized for the UI from first/last real model attempt messages while full per-model attempts stay in server logs.

Rate-limit detection:

- Uses AI SDK `APICallError` where available.
- Also checks common `statusCode`, `status`, `response.status`, and nested `cause` shapes.

## Editor Block Schema Architecture

The main schema file is `libs/utils/src/lib/editor-blocks.ts`.

It exports:

- `editorBlockDocumentSchema`
- `editorGeneratedBlockDocumentSchema`
- `createEditorGeneratedTableDocumentSchema`
- `getEditorBlocksJsonSchema`
- `getEditorBlocksSchemaAwarenessString`
- `validateEditorBlockDocument`
- `safeValidateEditorBlockDocument`

The root schema is:

```ts
{
  type: 'doc',
  content?: EditorBlockNode[]
}
```

Allowed full editor node types:

```txt
doc
text
paragraph
heading
blockquote
codeBlock
bulletList
orderedList
listItem
taskList
taskItem
table
tableRow
tableCell
tableHeader
horizontalRule
hardBreak
image
divBlock
spanComponent
svg
styleTag
scriptTag
alertWidget
ctaWidget
```

Allowed mark types:

```txt
bold
italic
strike
code
link
highlight
textStyle
subscript
superscript
```

There are two related schema surfaces:

1. Full validation schema.
   - Allows the existing editor/database content surface.
   - Includes richer node types such as `image`, `divBlock`, `svg`, `styleTag`, and `scriptTag`.
2. Generated-content schema.
   - Smaller and safer subset from the previous strict generated-output flow.
   - Prevents the model from generating unsafe or overly complex structures.
   - Includes paragraphs, headings, blockquotes, code blocks, lists, task lists, tables, horizontal rules, alert widgets, and CTA widgets.

The inline editor no longer asks the model to emit this JSON directly. These schemas remain useful for:

- Stored product `description_json`.
- Schema verification scripts.
- Global-agent tools that update product descriptions or other stored editor JSON.

The legacy strict JSON generator kept a special strict table schema:

- Exactly one top-level `table`.
- Minimum rows based on prompt.
- Minimum columns based on prompt.
- Every row must contain cells/headers.
- Every cell/header must contain at least one paragraph with text.

This was added for the old strict JSON path because generic structured generation often produced weak or invalid pricing tables. The replacement inline assistant asks for valid HTML table markup and relies on Tiptap's HTML parser.

## Inline HTML Editor Assistance

High-level flow:

```txt
NotionEditor prompt
  -> POST /api/ai/generate-blocks
  -> require ADMIN or WRITER
  -> generateEditorHtmlFragment()
  -> Vercel AI SDK generateText()
  -> lightweight HTML fragment validation
  -> return { html, credentialSource, modelId }
  -> editor setContent(html) or insertContent(html)
```

Route:

```txt
apps/nextblock/app/api/ai/generate-blocks/route.ts
```

Request schema:

```ts
{
  prompt: string;  // 3..4000 chars
  context?: string; // max 2000 chars
}
```

Access:

- Requires authenticated user.
- Requires profile role `ADMIN` or `WRITER`.

Response:

- Returns:

```ts
{
  html: string;
  credentialSource: 'env' | 'stored' | 'manual';
  modelId: string;
}
```

- Adds diagnostic headers:
  - `x-cortex-ai-credential-source`
  - `x-cortex-ai-model`

Generator:

```txt
libs/cortex/src/lib/ai-block-generation.ts
```

Prompt persona:

```txt
NextBlock Cortex AI inline rich-text assistant
```

Important prompt rules:

- Return only an HTML fragment.
- No markdown code fences.
- No explanations.
- Do not include `<!doctype>`, `<html>`, `<head>`, or `<body>`.
- Use semantic headings, paragraphs, lists, tables, blockquotes, code blocks, and horizontal rules.
- For tables, use valid `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>`.
- Use `<style>` or `<script>` only when explicitly requested. The editor already has `StyleTagNode`, `ScriptTagNode`, and source-mode parsing for those tags.

Vercel AI SDK usage:

```ts
generateText({
  prompt,
  system,
  maxRetries: 0,
})
```

Editor insertion:

```txt
libs/editor/src/lib/NotionEditor.tsx
```

Behavior:

- If the editor is empty, Cortex AI uses `editor.commands.setContent(payload.html)`.
- If the editor already has content and there is no active text selection, it appends `payload.html` at the end of the document.
- If there is an active text selection, it replaces that selection with `payload.html`.
- Existing content is preserved for non-empty editors.
- The client sends insertion context (`append-to-end`, `replace-selection`, or empty document), selected text when present, and a trailing slice of existing editor text so the model can continue without duplicating content.
- The server rejects empty fragments, markdown fences, full HTML documents, obvious conversational wrappers, plain text with no HTML tags, uneven table rows, and tables with empty cells.
- The server also strips empty top-level paragraphs/headings and normalizes generated tables to remove blank spacer rows/columns before insertion.

The old strict `generateObject()` Tiptap JSON path is replaced for inline prompts. The route name remains `/api/ai/generate-blocks` for compatibility, but the successful payload is now HTML-first.

## Global Agent Architecture

The global dashboard agent has two main pieces:

1. Tool registry and execution functions.
2. Streaming route and chat UI.

### Tool Registry

File:

```txt
libs/cortex/src/lib/ai-global-agent-tools.ts
```

Exported tool schemas:

- `updateNavigationBarInputSchema`
- `updateFooterInputSchema`
- `searchDocumentationInputSchema`
- `cortexAiPageContextSchema`
- `readCurrentCmsItemInputSchema`
- `updateCurrentCmsFieldsInputSchema`
- `updateContentBlockInputSchema`
- `updateSectionColumnBlockInputSchema`
- `fetchEcommerceStatsInputSchema`

Exported executors:

- `executeUpdateNavigationBar`
- `executeUpdateFooter`
- `executeSearchDocumentation`
- `executeReadCurrentCmsItem`
- `executeUpdateCurrentCmsFields`
- `executeUpdateContentBlock`
- `executeUpdateSectionColumnBlock`
- `executeFetchEcommerceStats`

Tool factory:

```ts
createCortexGlobalAgentTools(context)
```

Tools are passed to Vercel AI SDK `streamText`.

The new CMS editing tools require a current `pageContext` supplied by the chat request. They are admin-only for this rollout because the global-agent route requires `ADMIN`.

### update_navigation_bar

Purpose:

- Update public header navigation for a locale.

Input:

```ts
{
  items: Array<{
    label: string;
    url: string;
    target?: '_self' | '_blank';
    children?: Array<{ label: string; url: string; target?: '_self' | '_blank' }>;
  }>;
  languageCode?: string; // locale code or language name
  mode?: 'append' | 'replace' | 'update';
  match?: { label?: string; url?: string };
}
```

URL validation allows:

```txt
/
#
http://
https://
mailto:
tel:
```

Database table:

```txt
navigation_items
```

Important behavior:

- `append` preserves existing links.
- `replace` deletes all existing items for `menu_key = HEADER` and the selected language.
- `update` changes one existing item found by `match.label`, `match.url`, or the replacement URL.
- Append is idempotent by normalized URL.
- If the same URL already exists for that menu/language, it increments `skippedCount` instead of inserting a duplicate.
- Children are inserted with `parent_id`.
- Root `order` is based on existing top-level max order.

Language behavior:

- `languageCode` can be a code (`fr`) or a name (`French`).
- Active languages are loaded from `languages`.
- Matching normalizes accents/case.
- Supported aliases currently include common names such as `english`, `french`, `francais`, `spanish`, etc.

This fixed the case where a prompt like `can you also add it in French?` could stall or fail if a model supplied `French` instead of `fr`.

### update_footer

Purpose:

- Update public footer links and/or footer copyright.

Input:

```ts
{
  languageCode?: string;
  links?: NavigationItemInput[];
  copyright?: Record<string, string>;
}
```

Behavior:

- `links` currently replace `menu_key = FOOTER` for the selected language.
- `copyright` upserts `site_settings.key = footer_copyright`.
- The same language-name resolver is used for footer links.

Important limitation:

- No append mode for footer links yet. If a user asks to add one footer link, current behavior may replace the footer link set if the model calls `update_footer` with only that link.

### search_documentation

Purpose:

- Provide project/documentation context to the agent.

Input:

```ts
{
  query: string;
  limit?: number; // 1..8, default 4
}
```

Behavior:

- Searches published `posts` and `pages`.
- Uses simple lowercase term matching/scoring, not vector embeddings.
- Returns snippets with:
  - `title`
  - `url`
  - `source`
  - `excerpt`

Future RAG work should replace or augment this with an embeddings table and vector similarity search.

### read_current_cms_item

Purpose:

- Read the page, post, or product currently being edited.
- Return page/post/product metadata and, for pages/posts, ordered block summaries or full block content.

Input:

```ts
{
  includeBlocks?: boolean; // default true
  includeBlockContent?: boolean; // default false
}
```

Behavior:

- Requires `pageContext` from the chat request.
- Fetches from `pages`, `posts`, or `products` by current entity id.
- For pages/posts, fetches `blocks` by `page_id` or `post_id` and sorts by `order`.
- Omits block `content` unless `includeBlockContent` is true, keeping normal reads compact.

### update_current_cms_fields

Purpose:

- Update metadata fields on the current page, post, or product.

Supported fields:

- Pages: `title`, `slug`, `status`, `meta_title`, `meta_description`.
- Posts: `title`, `slug`, `status`, `label`, `subtitle`, `excerpt`, `published_at`, `feature_image_id`, `meta_title`, `meta_description`.
- Products: `title`, `slug`, `status`, `short_description`, `description_json`, `meta_title`, `meta_description`.

Behavior:

- Requires `pageContext`.
- Validates page/post status as `draft`, `published`, or `archived`.
- Validates product status as `draft`, `active`, or `archived`.
- Validates product `description_json` against `editorBlockDocumentSchema`.
- Revalidates the CMS edit path and public page/post/product path.

### update_content_block

Purpose:

- Update an existing top-level block on the current page or post.

Input:

```ts
{
  blockId: number;
  blockType?: BlockType; // assertion only
  content: Record<string, unknown>;
}
```

Behavior:

- Requires current page/post `pageContext`.
- Refuses to update blocks outside the current page/post.
- Treats `blockType` as an assertion, not a type-changing request.
- Validates `content` with `validateBlockContent(existingBlockType, content)`.
- Updates only `blocks.content` and `updated_at`.

### update_section_column_block

Purpose:

- Update an existing nested block inside a current page/post `section` block.

Input:

```ts
{
  parentBlockId: number;
  columnIndex: number;
  blockIndex: number;
  blockType?: BlockType; // assertion only
  content: Record<string, unknown>;
}
```

Behavior:

- Requires current page/post `pageContext`.
- Refuses to update parent blocks outside the current page/post.
- Parent must be a `section` block (the only nested-column parent type; legacy
  `hero` blocks are now sections with an `is_hero` flag).
- Validates nested content against the nested block type.
- Validates final parent section content before saving.

### fetch_ecommerce_stats

Purpose:

- Fetch quantitative ecommerce statistics and reports from the database.
- Answer questions about revenue, order counts, and top-selling products over a time range.

Input:

```ts
{
  currency?: string; // ISO code, default "USD"
  query: string; // The analytical question
  reportType?: 'revenue' | 'orders' | 'products' | 'general';
  timeRange?: 'last_7_days' | 'last_30_days' | 'last_month' | 'last_90_days' | 'all_time';
}
```

Behavior:

- Read-only: does not require confirmation.
- Queries `order_items` joined with `orders` and `products`.
- Filters by `orders.status = 'paid'`.
- Supports aggregation by product and currency.
- Provides a summary of total orders, total revenue, and a list of top products.
- Restricted to authenticated admins in the `global-agent` route.

### Revalidation

Tool mutations call:

```txt
revalidatePath('/', 'layout')
revalidatePath('/cms/navigation')
```

Navigation/footer mutations keep public layout/nav and CMS navigation screens in sync. Current CMS item/block mutations revalidate the active edit screen and the public page, article, or product URL when a slug is available.

## Global Agent Route

File:

```txt
apps/nextblock/app/api/ai/global-agent/route.ts
```

Access:

- Requires authenticated `ADMIN`.
- Requires active `cortex-ai` package.

Request schema:

```ts
{
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  pageContext?: {
    contentType: 'page' | 'post' | 'product';
    entityId: number | string;
    slug?: string | null;
    title?: string | null;
    languageId?: number | null;
    currentEditor?: {
      blockId?: number | string | null;
      blockType?: string | null;
      field?: string | null;
    };
  } | null;
}
```

Old `{ messages }` requests remain valid. If no `pageContext` is supplied, the agent can still use navigation/footer/search tools but should not perform current-item mutations.

Limits:

- Max 40 messages.
- Max 8000 chars per message.

Model orchestration:

- Uses `streamText`.
- Uses `buildCortexAiRoutingPolicy`.
- Uses `stepCountIs(6)`.
- Temperature is `0.1`.
- Max output tokens is `2000`.
- Per-model attempt timeout is `30000ms`.

System prompt:

- Agent identity: `NextBlock Cortex AI`.
- Explicit Planner -> Executor -> Evaluator behavior.
- Use typed tools for mutations.
- Append header links unless replacement is clearly requested.
- Use current page/post/product context for phrases like "this page", "this product", or "this block".
- Do not update content outside the supplied current CMS context.
- Map language names to codes, e.g. French -> fr.
- Follow-up language requests should reuse prior requested item.

### SSE Protocol

The route returns `text/event-stream`.

Events:

```ts
type CortexAgentStreamEvent =
  | { type: 'meta'; credentialSource: string; modelId: string }
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; toolName: string; toolCallId?: string; input?: unknown }
  | { type: 'tool-result'; toolName: string; toolCallId?: string; output?: unknown }
  | { type: 'tool-error'; message: string; toolName?: string; toolCallId?: string }
  | { type: 'error'; message: string }
  | { type: 'finish' };
```

### Defensive Streaming Choices

The global agent route intentionally buffers assistant text instead of streaming every token immediately.

Reason:

- Some OpenRouter free models can emit raw tool-call payload text such as `</TOOLCALL>` or JSON fragments instead of using the SDK tool-call channel.
- Buffering allows the route to detect and suppress raw tool-call leakage before the user sees it.

Raw tool-call leak detection checks for:

- `<toolcall`
- `</toolcall`
- `"arguments"`
- tool names such as `"update_navigation_bar"`, `"update_current_cms_fields"`, and `"update_section_column_block"`

Rate-limit text detection checks for:

- `rate limit exceeded`
- `free-models-per-day`
- `too many requests`

Fallback strategy:

- If no tool has run and the attempt hits 429/raw-tool/rate-limit text, the route can try the next model.
- If a tool has already succeeded, the route does not retry another model because retrying can duplicate side effects.
- If a tool succeeded but final natural-language response fails, the route sends a deterministic confirmation such as:
  - `Done. I updated the navigation bar.`
  - `That navigation link already exists, so I left the header unchanged.`
  - `Done. I updated the footer.`
  - `Done. I updated the current CMS fields.`
  - `Done. I updated the current content block.`

This was added after a real issue where:

1. The navigation mutation succeeded.
2. The final model response hit a free-model rate limit.
3. The UI showed an error or raw tool-call text.

The current implementation treats the DB tool result as the source of truth once a mutation succeeds.

## Dashboard Chat UI

File:

```txt
apps/nextblock/app/cms/components/CortexGlobalAgentChat.tsx
```

Rendered from:

```txt
apps/nextblock/app/cms/CmsClientLayout.tsx
```

Condition:

```tsx
{isAdmin && isCortexAiActive && <CortexGlobalAgentChat />}
```

Features:

- Floating brain icon launcher.
- Right-side popup panel.
- Persistent local browser thread history.
- Sends current CMS page/post/product context with chat requests when available.
- New thread button.
- Delete old thread button.
- Stop streaming button.
- Tool-call status rows:
  - `Updating navigation bar...`
  - `Footer updated`
  - `Documentation searched`
- Metadata badge showing credential source and model id.

Storage:

```txt
localStorage key = nextblock-cortex-global-agent-chat-threads
legacy sessionStorage key = nextblock-cortex-global-agent-chat
```

Limits:

- Max stored threads: 20.
- Max stored messages per thread: 40.
- Request timeout: 45000ms.

Important behavior:

- The UI aborts requests after timeout and shows a clean error instead of leaving a spinner forever.
- The UI cancels the stream reader after receiving `finish`.
- The component returns `null` until mounted, preventing SSR/client localStorage mismatches.
- `CortexAiPageContextProvider` wraps the CMS layout. Edit screens register page, post, and product context via `CortexAiPageContextRegistrar`; the chat also parses `/cms/pages/:id/edit`, `/cms/posts/:id/edit`, and `/cms/products/:id/edit` as a fallback.

## Hydration Fixes Related to Cortex AI Work

During implementation, React hydration warnings appeared around Radix-generated IDs. The visible stack pointed at buttons/selects/dialogs, but the root cause was a different component tree/order between server render and first client render.

Fixes:

- `ResponsiveNav` now renders Radix-heavy search/auth/language/currency/cart controls inside a local `ClientOnly` wrapper.
- `Header` passes render functions instead of reusing the same React element instance in both desktop and mobile nav sections.
- `FeedbackModal` renders a plain trigger button before mount, then wraps it with Radix `Dialog` after hydration.
- `CortexGlobalAgentChat` is also mounted only after the client has loaded thread state.
- `ProductFormClientShell` renders a deterministic placeholder on SSR/initial hydration, then mounts the Radix-heavy product form controls client-side.

These choices keep SSR and first client render aligned while preserving interactive behavior after hydration.

## Dashboard Premium CTA

File:

```txt
apps/nextblock/app/cms/dashboard/actions.ts
```

Important detail:

- Dashboard stats now check `activePackages.has('cortex-ai')`.
- Older code checked `activePackages.has('ai')`, which incorrectly showed the "Upgrade to Premium" CTA even when Cortex AI was active.

The CTA component itself lives in:

```txt
apps/nextblock/app/cms/dashboard/components/DashboardComponents.tsx
```

It returns `null` when both commerce and Cortex AI are active:

```ts
if (hasCommerce && hasAi) return null;
```

## Tests and Verification

Package scripts:

```txt
npm run verify:cortex-ai-routing
npm run verify:cortex-ai-generate-blocks
npm run verify:cortex-ai-global-tools
npm run verify:cortex-ai-build-widget
npm run verify:editor-block-schema
```

Useful commands:

```bash
npm run verify:cortex-ai-global-tools
npm run verify:cortex-ai-routing -- --mode=both
npm run verify:cortex-ai-generate-blocks -- "Generate a 3-tier pricing table"
npm run verify:editor-block-schema
npx nx lint nextblock --skip-nx-cache
npx nx build nextblock --skip-nx-cache
```

Vitest files:

```txt
libs/cortex/src/lib/ai-key-crypto.test.ts
libs/cortex/src/lib/ai-model-catalog.test.ts
libs/cortex/src/lib/ai-model-registry.test.ts
libs/cortex/src/lib/ai-global-agent-tools.test.ts
```

Notes:

- Live OpenRouter verification needs a valid `OPENROUTER_API_KEY` or stored BYOK.
- Free model limits may make live routing/generation tests flaky.
- Prefer focused verification scripts for Cortex AI changes instead of running broad test suites unless an error requires it.

## Common Troubleshooting

### The chat bubble stays loading

Current protections:

- Server-side per-model timeout: 30 seconds.
- Client request timeout: 45 seconds.
- Client stops reading on `finish`.

If it still happens:

1. Hard refresh the browser to clear a stuck request.
2. Check browser console for fetch/stream errors.
3. Check server logs from `/api/ai/global-agent`.
4. Verify OpenRouter account limits.
5. Verify `OPENROUTER_API_KEY` or stored BYOK exists.

### The agent says rate limit exceeded

OpenRouter free models can hit account-level daily limits. This can happen even with a real API key if the account has no credits or free quota is exhausted.

Mitigations:

- Add OpenRouter credits.
- Save a stored BYOK and select a compatible paid model in `/cms/settings/cortex-ai`.
- Add or change fallback models in `ai-model-registry.ts`.

### Inline editor generation fails with a generic fallback error

The inline route now summarizes first/last real model errors from routing attempts and returns that message in the JSON body. Server logs still include the full per-model `attempts` array.

Check:

- Sandbox BYOK is present in `localStorage` under `cortex_ai_sandbox_openrouter_api_key`.
- Sandbox model selection is present under `cortex_ai_sandbox_openrouter_model_selection`.
- Request headers include `x-sandbox-openrouter-key` and `x-sandbox-openrouter-model` in sandbox.
- Env-only routing is not expected to use paid models; it always uses the free registry.
- The model returned an HTML fragment, not markdown fences, a full HTML document, or conversational prose.

### The agent added a link but then showed an error

The mutation may have succeeded before the model hit a final-response error. Current route behavior should synthesize a clean confirmation after a successful tool result.

Navigation append is idempotent by URL, so retrying the same request should skip duplicate URLs.

### "Add it in French" does not work

The tool backend can resolve language names and aliases, but the language must exist and be active in `languages`.

Check:

- `languages.code = 'fr'`
- `languages.name = 'French'` or compatible alias
- `is_active` is not false

### Stored key cannot be decrypted

Likely causes:

- `CORTEX_AI_ENCRYPTION_KEY` changed.
- Stored envelope was manually edited.
- Stored key was encrypted in a different environment.

Resolution:

- Clear the stored key in `/cms/settings/cortex-ai`.
- Set the intended encryption key.
- Save the OpenRouter key again.

### Cortex AI package active but dashboard still shows AI upsell

Check:

- Active package row has `package_id = 'cortex-ai'`.
- Dashboard code checks `cortex-ai`, not `ai`.
- Hard refresh or clear Next cache if stale.

### Hydration warning involving Radix IDs

Likely cause:

- A client component renders a different tree on first client render than SSR.

Known fixed areas:

- Public nav Radix controls are client-only after mount.
- Feedback modal trigger is stable before mount.
- Chat component waits until mounted.
- Product edit form controls wait until mounted through `ProductFormClientShell`.

If new warnings appear, inspect for:

- `typeof window` branches inside render.
- `Date.now()` or `Math.random()` during render.
- LocalStorage/sessionStorage reads during initial state that affect rendered tree.
- Reusing the same React element in two places.

## Security Notes

- Never expose OpenRouter API keys to client components.
- Keep AI config/client modules server-only.
- Stored BYOK plaintext is never persisted.
- Stored BYOK plaintext is only available transiently server-side after decrypt.
- Settings server actions re-check admin role.
- AI route handlers re-check authentication/role.
- Global agent DB mutations use service-role Supabase only on the server.
- Sensitive `site_settings` row is protected by RLS.
- Do not log plaintext API keys.
- Do not paste real secrets into documentation, PRs, screenshots, or AI prompts.

## Extension Guide

### Adding a New Agent Tool

1. Add a strict Zod input schema in `ai-global-agent-tools.ts`.
2. Add a pure executor function that accepts input and `ToolExecutionContext`.
3. Re-check any database assumptions inside the executor.
4. Use service-role Supabase through context.
5. Return a small structured result with `success: true`.
6. Add the tool to `createCortexGlobalAgentTools`.
7. Update the global agent system prompt if needed.
8. Add focused tests in `ai-global-agent-tools.test.ts`.
9. Update `verify-cortex-ai-global-tools.ts`.
10. Consider deterministic completion copy in `getToolCompletionMessage`.

Rules:

- Tool arguments must be typed.
- Avoid raw SQL unless absolutely necessary.
- Make side-effecting operations idempotent when possible.
- Do not retry side-effecting tool calls after success.

### Adding a New Editor Node Type

1. Confirm the node exists in the actual Tiptap extension set.
2. Add it to the full schema in `libs/utils/src/lib/editor-blocks.ts`.
3. Decide if it is safe for stored AI-authored JSON fields such as product `description_json`.
4. If safe, add it to the generated/schema-constrained JSON surface used by validators and agent tools.
5. Update `EDITOR_BLOCK_ALLOWED_NODE_TYPES`.
6. Update schema awareness string if needed.
7. If the node has an HTML representation, verify the inline assistant can insert it through Tiptap's normal HTML parser/source-mode path.
8. Run:

```bash
npm run verify:editor-block-schema
```

9. Test inline generation with:

```bash
npm run verify:cortex-ai-generate-blocks -- "Generate content using the new node type"
```

### Adding a New Free Model

1. Add the model id to `CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY`.
2. Confirm the model supports the target feature:
   - tool calling for global agent
   - clean text/HTML fragment generation for the inline editor
3. Run:

```bash
npm run verify:cortex-ai-routing -- --mode=free
```

4. If used for generation, test:

```bash
npm run verify:cortex-ai-generate-blocks -- --model=MODEL_ID "Generate a 3-tier pricing table"
```

## Current Follow-Up Work Items

1. Seed a Cortex AI product/package showcase in sandbox reset, similar to ecommerce.
   - Use `apps/nextblock/public/images/cortex-ai-square.webp`.
   - Freemius product id: `28609`.
   - Freemius plan id: `47122`.
2. Add footer append mode to avoid replacing all footer links for small edits.
3. Replace keyword documentation search with embedding-based RAG.
4. Add server-side chat thread persistence if browser-local history is not enough.
5. Add page-aware block insertion tools with explicit idempotency keys.
6. Add explicit package gating to editor prompt visibility if desired. The current route enforces access/credentials, but the editor prompt UI is not itself hidden by package state in `NotionEditor`.
7. Consider search/filter affordances in the model picker if the compatible OpenRouter catalog becomes too large for a basic select.

## Mental Model for Future Agents

When modifying Cortex AI, keep these invariants:

1. `cortex-ai` is the package id. Do not reintroduce `ai`.
2. Never put secrets in client code.
3. Stored BYOK overrides `OPENROUTER_API_KEY` so paid model selection can work even in sandbox.
4. Env-only routing must stay locked to the three explicit free models.
5. Stored BYOK requires `CORTEX_AI_ENCRYPTION_KEY`.
6. Stored model selection must only use models with `tools` and `structured_outputs`.
7. Inline editor generation returns HTML fragments, not strict Tiptap JSON.
8. Stored product descriptions and global-agent editor JSON fields still validate against editor schemas.
9. Global mutations must go through typed tools.
10. Side-effecting tools should be idempotent when possible.
11. If a side-effecting tool succeeds and the model fails afterward, report the tool result instead of retrying blindly.
12. Free OpenRouter models are useful but unstable; guard against 429s, malformed tool-call text, invalid HTML fragments, and no-output generation.
13. Multilingual mutations should use active rows from `languages`, not hardcoded assumptions.
