# Editor Context: Tiptap v3, Toolbar, Preview, CSP, and Runtime Scripts

This note explains how the Tiptap v3 editor is wired up in the monorepo, how custom HTML/CSS/JS content is handled, and how the CMS renders that content under a nonce-based Content Security Policy (CSP).

## Scope

- Library: `libs/editor` (publishable Tiptap v3 package)
- App: `apps/nextblock` (consumes the editor and enforces CSP)

## Key Files

- **Editor scaffolding**
  - `libs/editor/src/lib/editor.tsx`
  - `libs/editor/src/lib/components/menus/Toolbar.tsx`
  - `libs/editor/src/lib/kit.ts`
- **Custom nodes and helpers**
  - `libs/editor/src/lib/extensions/StyleTagNode.ts`
  - `libs/editor/src/lib/extensions/ScriptTagNode.ts`
  - `libs/editor/src/lib/extensions/DivNode.ts`
  - `libs/editor/src/lib/extensions/PreserveAllAttributesExtension.ts`
  - `libs/editor/src/lib/utils/formatHTML.ts` (pretty prints HTML for the source modal)
- **Runtime integration**
  - `apps/nextblock/middleware.ts` — issues CSP headers and request nonces
  - `apps/nextblock/components/blocks/renderers/TextBlockRenderer.tsx` — stamps nonce on inline scripts
  - `apps/nextblock/components/blocks/renderers/ClientTextBlockRenderer.tsx` — hydrates HTML client side when needed
  - `apps/nextblock/components/HtmlScriptExecutor.tsx` — optional helper to execute inline scripts via blob URLs

## Toolbar Features

- **Source modal**  
  Displays `editor.getHTML()` formatted by `formatHTML`. Users can review and apply updates. Button icon: `FileCode2`.
- **Preview modal**  
  Renders the current HTML inside a sandboxed iframe. Inline scripts are rewritten to `blob:` URLs and the iframe sandbox includes `allow-scripts allow-same-origin allow-modals`.
- **Insert menu additions**  
  Buttons for CSS, Script, and DIV blocks that prompt for values and inject well-formed HTML snippets.

## Extension Kit Highlights (`kit.ts`)

- Custom nodes ensure `<div>`, `<style>`, and `<script>` elements round-trip with their attributes.
- `PreserveAllAttributesExtension` keeps common attributes on standard nodes.
- StarterKit is configured with an explicit `History` extension to control undo/redo.
- Additional extensions (code block lowlight, typography, etc.) are registered here.

## Preview vs Production Rendering

- **Editor preview**  
  Runs inside the Toolbar modal using iframe blob URLs. Requires CSP allowances for `blob:` scripts and frames.
- **Live pages**  
  In production the middleware assigns a per-request nonce; `TextBlockRenderer` injects the same nonce into inline `<script>` tags before rendering.
- **Fallback executor**  
  `HtmlScriptExecutor` can convert inline scripts to blob URLs if nonce-based CSP is unavailable.

## CSP Considerations

- Development mode skips strict CSP headers so the Next.js dev overlay can inject scripts.
- Production CSP includes `script-src 'self' blob: data: 'nonce-...'`. Inline event handlers remain blocked; script logic must live inside `<script>` tags.
- External scripts have to be whitelisted in `middleware.ts` if required.

## Linting and Hook Hygiene

- Hooks in `Toolbar.tsx` are declared before early returns to satisfy `react-hooks/rules-of-hooks`.
- Empty catches are spelled `catch (_err) { /* ignore */ }` to appease `no-empty`.

## Data Flow Summary

1. Author edits content with the Tiptap editor; custom nodes preserve raw HTML.
2. Source modal allows direct HTML edits and formatting.
3. Preview modal renders HTML + scripts in an isolated iframe.
4. On save, block content (HTML) persists to Supabase.
5. Live rendering injects CSP nonce and hydrates HTML for visitors.

## Extending the Editor

- Add new HTML tags by building a Tiptap node (parser + renderer) and registering it in `kit.ts`.
- For client-side placeholders (e.g., `<iframe>`), use a node view to display safe representations inside the editor.
- Remember to update both the editor bundle and the app renderer when introducing new content types.
