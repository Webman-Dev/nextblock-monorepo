# Tiptap v3 Editor Integration

This guide captures the current state of the Tiptap v3 implementation, required dependencies, extension configuration, UI elements, and verification steps.

## 1. Goals

- Provide a Notion-style editing experience for CMS authors.
- Offer a reusable library (`@nextblock-cms/editor`) that can be consumed by the Next.js app and the CLI scaffold.
- Support custom HTML/CSS/JS content while respecting CSP rules (see `docs/editor-context.md`).

## 2. Core Packages

Install these dependencies in the monorepo (already present in `package.json` but kept here for reference):

```
@tiptap/react @tiptap/core @tiptap/starter-kit
@tiptap/extension-bubble-menu @tiptap/extension-floating-menu @tiptap/suggestion
@tiptap/extension-link @tiptap/extension-highlight @tiptap/extension-underline
@tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-font-family
@tiptap/extension-subscript @tiptap/extension-superscript
@tiptap/extension-code-block-lowlight lowlight
@tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row
@tiptap/extension-table-header @tiptap/extension-table-cell
@tiptap/extension-task-list @tiptap/extension-task-item
@tiptap/extension-emoji @tiptap/extension-mathematics katex
@tiptap/extension-typography @tiptap/extension-placeholder
@tiptap/extension-focus @tiptap/extension-trailing-node
@tiptap/extension-character-count
@tiptap/extension-drag-handle @tiptap/extension-drag-handle-react
```

All menu utilities come from their standalone packages (BubbleMenu/FloatingMenu/Suggestion). Do not import menus from `@tiptap/react`.

## 3. Extension Setup (`libs/editor/src/lib/kit.ts`)

- **StarterKit:** Document, Paragraph, Text, Heading, Blockquote, List, HardBreak, HorizontalRule, and Code with custom configuration.
- **Marks:** Bold, Italic, Strike, Code, Highlight, Underline, Link, TextStyle/Color, Subscript, Superscript, FontFamily.
- **Nodes:** Image, Table (with row/header/cell), TaskList/TaskItem, CodeBlockLowlight, Emoji, Mathematics, Details, TrailingNode, Placeholder, Focus, Typography.
- **Custom nodes:** StyleTagNode, ScriptTagNode, DivNode, PreserveAllAttributesExtension (see `docs/editor-context.md`).
- **Utilities:** CharacterCount, History, Gapcursor, Dropcursor, DragHandle, BubbleMenu, FloatingMenu, Suggestion (for slash commands and mentions).

## 4. UI Components

- **Editor entrypoint:** `libs/editor/src/lib/editor.tsx` exports the `NotionEditor` component.
- **Toolbar:** `libs/editor/src/lib/components/menus/Toolbar.tsx`
  - Houses the source modal, preview modal, formatting buttons, and insert actions.
  - Relies on `formatHTML.ts` for pretty-printing source output.
- **Slash menu & bubble/floating menus:** Implemented via Suggestion/BubbleMenu/FloatingMenu extensions with custom React renderers under `libs/editor/src/lib/components/menus`.
- **Custom widget hooks:** CTA and alert widget specs live in `docs/inline-cta-widget-design.md` and `docs/inline-widget-design.md`. Implementations reside in the editor library.

## 5. Styling

- Global editor styles ship with the package (`@nextblock-cms/editor/styles/editor.css`).
- Consumers import the stylesheet in `app/layout.tsx` or equivalent.
- Additional design tokens shared through `@nextblock-cms/ui`.

## 6. SSR Considerations

- `NotionEditor` is a `"use client"` component.
- The editor instance is created with `useEditor` to avoid `window` access during server rendering.
- Menus rely on Floating UI (bundled via Tiptap v3 packages); no tippy.js dependency.

## 7. Testing Checklist

1. **Library build:** `nx build editor` (injects `'use client';` into bundle outputs).
2. **Lint:** `nx lint editor` and `nx lint nextblock`.
3. **Manual QA:**
   - Marks: bold, italic, underline, strike, code, highlight, link, text color, font family.
   - Nodes: headings, ordered/bullet lists, task lists (nested), blockquote, code block with syntax highlighting, horizontal rule, image upload, table resizing, details blocks, emoji picker, math (KaTeX).
   - Slash menu search + keyboard navigation.
   - Bubble menu for selection formatting; floating menu on empty paragraphs.
   - Source modal and preview modal behaviours.
   - Custom widgets (CTA, alert) render and persist attributes.
   - Character count and history shortcuts.
4. **Security:** Validate CSP nonce injection via `TextBlockRenderer` and preview iframe behaviour (see `docs/editor-context.md`).

## 8. Future Enhancements

- Package optional Monaco/Prettier support for the source modal with dynamic imports.
- Add node views for iframe/audio/video with safe placeholders.
- Expand slash menu categorisation and search.
- Explore collaboration extensions (Y.js) when real-time editing becomes a priority.

## 9. Related Docs

- `docs/editor-context.md` — detailed runtime + CSP discussion.
- `docs/block-editor-analysis.md` — overview of the block layout system that consumes editor output.
- `docs/inline-cta-widget-design.md` / `docs/inline-widget-design.md` — widget specs referenced by the editor.
