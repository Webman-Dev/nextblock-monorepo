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
   - Strict Tiptap JSON document generation for the editor.
   - A global dashboard agent that can update navigation/footer state and search CMS documentation-like content.

The implementation follows a schema-first approach:

- Anything inserted into the editor is validated against Zod schemas representing the allowed Tiptap JSON structure.
- Global agent tools use strict Zod tool arguments.
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
- OpenRouter client and model fallback registry.
- Tiptap editor JSON schemas and schema-to-JSON-schema helper.
- `/api/ai/generate-blocks` endpoint.
- Editor prompt UI in `NotionEditor`.
- `/api/ai/global-agent` endpoint with tool calling and SSE streaming.
- Persistent dashboard chat UI with local browser chat threads.
- Tools for:
  - `update_navigation_bar`
  - `update_footer`
  - `search_documentation`
- Multilingual navigation/footer tool arguments using either language codes or language names.
- Guardrails against OpenRouter free-model rate limits, raw tool-call leakage, and stuck loading streams.

Known incomplete or future work:

- Footer link updates currently replace footer links for the selected locale. Footer append mode is not yet implemented.
- Documentation search is keyword/scored search over `posts` and `pages`, not a vector embedding RAG system yet.
- The sandbox should eventually seed a visible product/package item for Cortex AI, similar to ecommerce. The preferred image asset is `apps/nextblock/public/images/cortex-ai-square.webp`.
- More agent tools can be added, but every tool must be schema-first and server-side only.

## Important Files

### Package and Environment

| File | Purpose |
| --- | --- |
| `libs/utils/src/lib/nextblock-packages.ts` | Package registry. Contains `cortex-ai` metadata and Freemius product/plan ids. |
| `apps/nextblock/lib/ai-config.ts` | Server-only Cortex AI constants and environment accessors. |
| `apps/nextblock/lib/ai-key-crypto.ts` | AES-256-GCM encryption/decryption helpers for stored OpenRouter BYOK keys. |
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
| `apps/nextblock/lib/ai-client.ts` | Creates OpenRouter provider/client with credential resolution and text-generation helper. |
| `apps/nextblock/lib/ai-model-registry.ts` | Free model registry, fallback-chain builder, rate-limit detection, fallback runner. |
| `apps/nextblock/scripts/verify-cortex-ai-routing.ts` | Manual verification script for OpenRouter routing. |

### Structured Editor Generation

| File | Purpose |
| --- | --- |
| `libs/utils/src/lib/editor-blocks.ts` | Main Tiptap JSON Zod schemas, allowed node/mark types, JSON Schema extraction. |
| `schemas/editor-blocks.ts` | Re-export shim for schema imports from app scripts/lib code. |
| `apps/nextblock/lib/ai-block-generation.ts` | Structured block generation orchestration using `generateObject`. |
| `apps/nextblock/app/api/ai/generate-blocks/route.ts` | Route handler for editor block generation. |
| `libs/editor/src/lib/NotionEditor.tsx` | Editor prompt UI and insertion behavior. |
| `apps/nextblock/scripts/validate-editor-block-schema.ts` | Validates editor schema against sample content and emits diagnostics. |
| `apps/nextblock/scripts/verify-cortex-ai-generate-blocks.ts` | Manual live generation verification script. |

### Global Agent

| File | Purpose |
| --- | --- |
| `apps/nextblock/lib/ai-global-agent-tools.ts` | Tool schemas and execution functions. |
| `apps/nextblock/app/api/ai/global-agent/route.ts` | Global agent route and SSE streaming orchestration. |
| `apps/nextblock/app/cms/components/CortexGlobalAgentChat.tsx` | Persistent dashboard chat UI with thread history. |
| `apps/nextblock/lib/ai-global-agent-tools.test.ts` | Unit tests for tool executors. |
| `apps/nextblock/scripts/verify-cortex-ai-global-tools.ts` | Focused verifier for global tools. |

### CMS Integration

| File | Purpose |
| --- | --- |
| `apps/nextblock/app/cms/layout.tsx` | Server layout checks package activation for ecommerce and Cortex AI. |
| `apps/nextblock/app/cms/CmsClientLayout.tsx` | Adds Cortex AI settings nav item and conditionally renders global chat. |
| `apps/nextblock/app/cms/settings/cortex-ai/page.tsx` | Settings page for activation/key status and BYOK forms. |
| `apps/nextblock/app/cms/settings/cortex-ai/actions.ts` | Server actions for reading, saving, and clearing BYOK keys. |
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

Server-side OpenRouter override. This takes precedence over stored BYOK.

Credential priority is:

1. Manual API key passed to helper functions, used mainly in tests/scripts.
2. `OPENROUTER_API_KEY`.
3. Encrypted key stored in `site_settings`.
4. No credential, which throws an error.

Important: `openrouter/free` is a free model-router id, not a replacement for authentication. The app still needs an OpenRouter API key from either the environment or stored BYOK.

OpenRouter free models can still hit free-model rate limits. A user with no credits or no credit card can see errors like `free-models-per-day`. Cortex AI catches these where possible and falls back to configured alternate models, but OpenRouter account-level limits may still block all free requests.

### CORTEX_AI_ENCRYPTION_KEY

Required only for saving/decrypting DB-stored BYOK keys.

Implementation detail:

- `apps/nextblock/lib/ai-key-crypto.ts` hashes this secret with SHA-256 to derive a 32-byte AES key.
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

Settings UI behavior:

- Page: `/cms/settings/cortex-ai`.
- Server actions re-check authenticated user role as `ADMIN`.
- Stored BYOK is never displayed in plaintext.
- The UI only shows masked `**** last4` status.
- If `OPENROUTER_API_KEY` exists, UI states that environment override is active.

## OpenRouter Client Architecture

The OpenRouter client is implemented in `apps/nextblock/lib/ai-client.ts`.

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

All AI client/config modules intentionally throw if imported into browser code:

```ts
if (typeof window !== 'undefined') {
  throw new Error(...)
}
```

This prevents accidental client-side exposure of secrets.

## Model Registry and Fallback

The model registry lives in `apps/nextblock/lib/ai-model-registry.ts`.

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

- `structuredJsonPreferred`: used for structured object/document generation.
- `toolCallingPreferred`: used for the global agent.

Both registries intentionally use the same model list. Future agent tools are expected to mutate broader CMS state through strict schemas, so every default free model must be able to support both structured JSON and tool calling.

Fallback behavior:

- `runWithCortexAiModelFallback` deduplicates model ids.
- Default retry condition is OpenRouter HTTP 429.
- Structured block generation overrides the retry predicate to also retry recoverable parse/schema/content/5xx errors.
- 401/402/403 are treated as non-recoverable for structured generation.

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
   - Smaller and safer subset for LLM output.
   - Prevents the model from generating unsafe or overly complex structures.
   - Includes paragraphs, headings, blockquotes, code blocks, lists, task lists, tables, horizontal rules, alert widgets, and CTA widgets.

For table prompts, block generation uses a special strict table schema:

- Exactly one top-level `table`.
- Minimum rows based on prompt.
- Minimum columns based on prompt.
- Every row must contain cells/headers.
- Every cell/header must contain at least one paragraph with text.

This was added because generic structured generation often produced weak or invalid pricing tables.

## Structured Block Generation

High-level flow:

```txt
NotionEditor prompt
  -> POST /api/ai/generate-blocks
  -> require ADMIN or WRITER
  -> generateEditorBlockDocument()
  -> Vercel AI SDK generateObject()
  -> Zod output schema
  -> return pure Tiptap doc JSON
  -> editor setContent() or insertContent()
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

- Returns only the generated Tiptap JSON document.
- Adds diagnostic headers:
  - `x-cortex-ai-credential-source`
  - `x-cortex-ai-model`

Generator:

```txt
apps/nextblock/lib/ai-block-generation.ts
```

Prompt persona:

```txt
Structural CMS Architect
```

Important prompt rules:

- Generate strict Tiptap JSON only.
- Use schema awareness string.
- Return only raw JSON.
- No markdown code fences.
- No explanations.
- Output must be ready for PostgreSQL JSONB insertion.

Vercel AI SDK usage:

```ts
generateObject({
  schema: outputSchema,
  schemaName: 'NextBlockTiptapDocument',
  schemaDescription: 'A strict Tiptap JSON document...',
  providerOptions: {
    openrouter: {
      plugins: [{ id: 'response-healing' }],
      provider: { require_parameters: true },
    },
  },
})
```

Editor insertion:

```txt
libs/editor/src/lib/NotionEditor.tsx
```

Behavior:

- If the editor is empty, Cortex AI uses `editor.commands.setContent(payload)`.
- If the editor already has content, it inserts `payload.content` at the cursor via `insertContent`.
- The editor performs a defensive client check that payload is a `doc` with an array `content`.

## Global Agent Architecture

The global dashboard agent has two main pieces:

1. Tool registry and execution functions.
2. Streaming route and chat UI.

### Tool Registry

File:

```txt
apps/nextblock/lib/ai-global-agent-tools.ts
```

Exported tool schemas:

- `updateNavigationBarInputSchema`
- `updateFooterInputSchema`
- `searchDocumentationInputSchema`

Exported executors:

- `executeUpdateNavigationBar`
- `executeUpdateFooter`
- `executeSearchDocumentation`

Tool factory:

```ts
createCortexGlobalAgentTools(context)
```

Tools are passed to Vercel AI SDK `streamText`.

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
  mode?: 'append' | 'replace';
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

### Revalidation

Tool mutations call:

```txt
revalidatePath('/', 'layout')
revalidatePath('/cms/navigation')
```

This keeps public layout/nav and CMS navigation screens in sync after tool updates.

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
}
```

Limits:

- Max 40 messages.
- Max 8000 chars per message.

Model orchestration:

- Uses `streamText`.
- Uses `CORTEX_AI_MODEL_REGISTRY.toolCallingPreferred`.
- Uses `stepCountIs(6)`.
- Temperature is `0.1`.
- Max output tokens is `2000`.
- Per-model attempt timeout is `30000ms`.

System prompt:

- Agent identity: `NextBlock Cortex AI`.
- Explicit Planner -> Executor -> Evaluator behavior.
- Use typed tools for mutations.
- Append header links unless replacement is clearly requested.
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
- tool names such as `"update_navigation_bar"`

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

## Hydration Fixes Related to Cortex AI Work

During implementation, React hydration warnings appeared around Radix-generated IDs. The visible stack pointed at buttons/selects/dialogs, but the root cause was a different component tree/order between server render and first client render.

Fixes:

- `ResponsiveNav` now renders Radix-heavy search/auth/language/currency/cart controls inside a local `ClientOnly` wrapper.
- `Header` passes render functions instead of reusing the same React element instance in both desktop and mobile nav sections.
- `FeedbackModal` renders a plain trigger button before mount, then wraps it with Radix `Dialog` after hydration.
- `CortexGlobalAgentChat` is also mounted only after the client has loaded thread state.

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
npm run verify:editor-block-schema
```

Useful commands:

```bash
npm run verify:cortex-ai-global-tools
npm run verify:cortex-ai-routing -- --mode=both
npm run verify:cortex-ai-generate-blocks -- "Generate a 3-tier pricing table"
npm run verify:editor-block-schema
npx nx lint nextblock --skip-nx-cache
```

Vitest files:

```txt
apps/nextblock/lib/ai-key-crypto.test.ts
apps/nextblock/lib/ai-model-registry.test.ts
apps/nextblock/lib/ai-global-agent-tools.test.ts
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
- Use a paid model id with the user's BYOK.
- Add or change fallback models in `ai-model-registry.ts`.

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
3. Decide if it is safe for generated AI output.
4. If safe, add it to the generated schema.
5. Update `EDITOR_BLOCK_ALLOWED_NODE_TYPES`.
6. Update schema awareness string if needed.
7. Run:

```bash
npm run verify:editor-block-schema
```

8. Test generation with:

```bash
npm run verify:cortex-ai-generate-blocks -- "Generate content using the new node type"
```

### Adding a New Free Model

1. Add the model id to `CORTEX_AI_FREE_MODEL_FALLBACK_REGISTRY`.
2. Confirm the model supports the target feature:
   - tool calling for global agent
   - structured outputs or reliable JSON for editor generation
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
5. Add explicit package gating to editor prompt visibility if desired. The current route enforces access/credentials, but the editor prompt UI is not itself hidden by package state in `NotionEditor`.
6. Consider a stronger model-selection UI or admin setting for paid models once BYOK is available.

## Mental Model for Future Agents

When modifying Cortex AI, keep these invariants:

1. `cortex-ai` is the package id. Do not reintroduce `ai`.
2. Never put secrets in client code.
3. `OPENROUTER_API_KEY` overrides stored BYOK.
4. Stored BYOK requires `CORTEX_AI_ENCRYPTION_KEY`.
5. Editor generation must use Zod-bound structured output.
6. Global mutations must go through typed tools.
7. Side-effecting tools should be idempotent when possible.
8. If a side-effecting tool succeeds and the model fails afterward, report the tool result instead of retrying blindly.
9. Free OpenRouter models are useful but unstable; guard against 429s, malformed tool-call text, and no-object generation.
10. Multilingual mutations should use active rows from `languages`, not hardcoded assumptions.
