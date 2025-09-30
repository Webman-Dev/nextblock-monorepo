# Editor Context: Tiptap v3, Toolbar, Preview, CSP, and Runtime Scripts

This document summarizes the architecture and decisions made while enabling HTML/CSS/JS authoring with Tiptap v3 in this monorepo, plus how the preview and front‑page execution work under a nonce‑based Content Security Policy (CSP).

## Scope

- Library: `libs/editor` (Tiptap v3 based WYSIWYG editor)
- App: `apps/nextblock` (renders content and enforces CSP via middleware)

## Key Files

- Editor component and wiring
  - `libs/editor/src/lib/editor.tsx`
  - `libs/editor/src/lib/components/menus/Toolbar.tsx`
  - `libs/editor/src/lib/kit.ts`

- Custom nodes and helpers for HTML/CSS/JS
  - `libs/editor/src/lib/extensions/StyleTagNode.ts`
  - `libs/editor/src/lib/extensions/ScriptTagNode.ts`
  - `libs/editor/src/lib/extensions/DivNode.ts`
  - `libs/editor/src/lib/extensions/PreserveAllAttributesExtension.ts`

- Utility
  - `libs/editor/src/lib/utils/formatHTML.ts` – lightweight HTML pretty‑printer for the Source modal

- App‑side rendering and CSP
  - `apps/nextblock/middleware.ts` – sets CSP (prod only) and supplies a per‑request nonce
  - `apps/nextblock/components/blocks/renderers/TextBlockRenderer.tsx` – stamps nonce on inline scripts
  - `apps/nextblock/components/blocks/renderers/ClientTextBlockRenderer.tsx` – renders HTML (widgets parsed)
  - `apps/nextblock/components/HtmlScriptExecutor.tsx` – optional helper to execute inline scripts via blob

## Toolbar Features

- Source modal (View/Apply) + Format button
  - In `Toolbar.tsx`, a modal shows `editor.getHTML()` preformatted using `formatHTML`. Apply calls `setContent`.
  - Button: FileCode2 ("View Source (HTML)")
  - Shortcut: Clicking the CSS/JS placeholder blocks in the editor also opens the Source modal.

- Preview modal (executes scripts)
  - Generates a Blob URL with the current HTML and rewrites inline `<script>` to `blob:` URLs. Iframe sandbox: `allow-scripts allow-same-origin allow-modals`.
  - Buttons: Refresh regenerates the Blob; Close revokes Blob URLs.

- Insert menu additions
  - CSS Block: prompts for CSS and prepends `<style>...</style>` at the top of the doc.
  - Script Block: prompts for JS and appends `<script>...</script>` to the end.
  - DIV Block: prompts for optional class, style, and content; inserts a visible `<div>` containing a `<p>` with escaped user text.

## Editor Extensions (`kit.ts`)

Registered to preserve and round‑trip custom HTML:

- `DivNode` – round‑trips `<div>` with attributes (class, style, id, …)
- `StyleTagNode` – round‑trips `<style>`; renders a safe placeholder in the editor
- `ScriptTagNode` – round‑trips `<script>`; safe placeholder in the editor (no execution while editing)
- `PreserveAllAttributesExtension` – keeps common attrs for standard nodes

Other notable setup:

- `StarterKit` uses `undoRedo: false` and a separate `History` extension
- `CodeBlockLowlight` configured with common languages

## Preview vs. Front‑Page Execution

- Preview (inside editor)
  - Done in `Toolbar.tsx`. Inline scripts become `blob:` scripts and run inside the iframe. Requires CSP to allow `blob:` in `script-src` (parent CSP applies to iframe).

- Front page (Next.js app)
  - Two supported strategies:
    1. Nonce stamping (current default)
       - `apps/nextblock/middleware.ts` (prod only) sets `Content-Security-Policy` with a per‑request nonce.
       - `TextBlockRenderer.tsx` adds `nonce="<value>"` to inline `<script>` tags in `html_content` before rendering; scripts execute normally under CSP.
    2. Blob execution (optional helper)
       - `apps/nextblock/components/HtmlScriptExecutor.tsx` can convert inline scripts to `blob:` URLs at runtime.
       - Only needed if nonce flow isn’t feasible; requires `script-src blob:` in CSP.

## CSP Behavior and Dev Overlay

- Dev vs. Prod
  - In development, do not send strict nonce CSP (Dev Overlay injects inline scripts without a nonce). `middleware.ts` is configured to send CSP only in production.
  - In production, CSP includes: `default-src 'self'`, `script-src 'self' blob: data: 'nonce-<...>'`, plus style/img/font/connect/frame rules.

- Implications
  - Inline event handlers (e.g., `onclick`) remain blocked under nonce CSP. Put code inside `<script>` blocks instead.
  - External scripts must be allowed by host in CSP if used.

## Lint / Hooks

- Hooks must be top‑level
  - In `Toolbar.tsx`, hooks are declared before early returns to satisfy `react-hooks/rules-of-hooks`.
  - Replaced empty catch blocks with `catch (_err) { /* ignore */ }` to satisfy `no-empty`.

## Data Flow Summary

1. Authoring (Editor)
   - User edits rich content; custom nodes ensure `<div>`, `<style>`, `<script>` and attributes round‑trip.
   - Source modal lets users adjust raw HTML safely and format it.
   - Preview modal executes scripts in a sandboxed iframe via `blob:` rewrite.

2. Rendering (App)
   - Prod: Middleware issues CSP with nonce; `TextBlockRenderer` stamps nonce on inline scripts; content renders securely.
   - Dev: No nonce CSP header (Dev Overlay compatibility). Content still renders; use Preview for `alert()` testing.

## Adding New Custom HTML Elements

- If you need additional tags (e.g., `<iframe>`, `<audio>`, `<video>`):
  - Create a Tiptap node to parse/render the tag and attributes.
  - Register it in `kit.ts` alongside existing custom nodes.
  - Decide editor behavior (placeholder vs. inline content vs. node view) to avoid unsafe execution in the editor.

## Troubleshooting

- “Refused to execute inline script…” on front page
  - Ensure you’re in production mode with CSP applied and the renderer stamps the nonce on inline scripts.
  - Verify no inline event handlers are used; move logic to `<script>` blocks.

- Preview shows “Ignored call to alert()…”
  - The iframe must include `allow-modals` in `sandbox` (already set). Also ensure parent CSP allows `blob:` and `frame-src blob:`.

- Empty DIV not visible in editor
  - DIV insertion now prompts for content and defaults to a `<p>New block</p>` so it’s visible.

## High‑Value Entry Points

- Edit toolbar features or prompts: `libs/editor/src/lib/components/menus/Toolbar.tsx`
- Add/modify custom nodes: `libs/editor/src/lib/extensions/*`
- Change extension registration: `libs/editor/src/lib/kit.ts`
- Tweak CSP or nonce behavior: `apps/nextblock/middleware.ts`
- Rendering text block HTML (nonce stamping path):
  - `apps/nextblock/components/blocks/renderers/TextBlockRenderer.tsx`
  - `apps/nextblock/components/blocks/renderers/ClientTextBlockRenderer.tsx`
- Optional blob executor: `apps/nextblock/components/HtmlScriptExecutor.tsx`

## Next Ideas

- Optional Monaco/Prettier in Source modal via dynamic imports for rich formatting.
- Additional nodes for more HTML coverage (e.g., `<iframe>` with safe blocking in editor and full render on page).
- Merge/append logic for multiple `<style>`/`<script>` insertions (deduplicate or aggregate by type).
