Awesome—let’s ship this in a clean, repeatable way. Below are **3 copy-paste prompts** you can run (sequentially) in your AI dev tool. They reference your repo docs, pin everything to **Tiptap v3**, and cover the three commits you were given **plus** every extra feature you listed.

I’ve also embedded the correct **v3 packages/imports** (e.g., `@tiptap/extension-floating-menu` instead of importing menus from `@tiptap/react`) and added guardrails so your **Nx + Next.js + Tailwind** build stays green.

---

# Prompt 1 — Plan & Dependency Audit (V3-STRICT)

**Title:** *Plan the v3 editor upgrades + map features to packages (no code changes yet)*

**Prompt (paste as-is):**
Read for context: `@/docs/monorepo-archetecture.md`, `@/docs/AI-Dev-Onboarding-Guide.md`, and `@/docs/Tiptap Feature-Rich Editor Prompts.md`.
ULTRA-THINK with a **Tiptap VERSION 3** mindset only. Do **not** use v2 APIs or `@tiptap/react` menu exports.

1. Confirm the 3 upcoming commits are correct and self-contained:

* `feat(editor): Add missing core extensions (Link, History, Underline, TextStyle, Color).`
* `fix(editor): Enhance extensions (table resizing, image options, character count).`
* `refactor(editor): Update Bubble, Floating & Slash menus for new features.`

2. Inventory the extensions we already use vs. missing. Create a **package map** (✅ official, ⚠️ beta/alt) for each requested feature:

* **Core/Doc:** StarterKit (Document, Paragraph, Text, Heading, Blockquote, HardBreak, HorizontalRule), History, Gapcursor, Dropcursor.
* **Marks:** Bold, Italic, Strike, Code (StarterKit); Link → `@tiptap/extension-link` (v3 docs); Highlight → `@tiptap/extension-highlight`; Subscript → `@tiptap/extension-subscript`; Superscript → `@tiptap/extension-superscript`; TextStyle → `@tiptap/extension-text-style`; Underline → `@tiptap/extension-underline`; Color → `@tiptap/extension-color`.
* **Nodes:** BulletList, OrderedList, ListItem, CodeBlock (StarterKit); CodeBlockLowlight → `@tiptap/extension-code-block-lowlight` (+ `lowlight`); Image → `@tiptap/extension-image`; Table → `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell`; TaskList/TaskItem → `@tiptap/extension-task-list`, `@tiptap/extension-task-item`; YouTube → `@tiptap/extension-youtube`; Details/DetailsSummary/DetailsContent → `@tiptap/extension-details`.
* **Functionality/UX:** BubbleMenu → `@tiptap/extension-bubble-menu`; FloatingMenu → `@tiptap/extension-floating-menu`; Suggestion utility → `@tiptap/suggestion`; CharacterCount → `@tiptap/extension-character-count`; Focus → `@tiptap/extension-focus`; FontFamily → `@tiptap/extension-font-family`; FontSize → prefer `TextStyleKit` if available, else `@tiptap/extension-font-size` (if present) or a small custom extension; Placeholder → `@tiptap/extension-placeholder`; TrailingNode → in `@tiptap/extensions` or `@tiptap/extension-trailing-node`; Typography → `@tiptap/extension-typography`; Mention → `@tiptap/extension-mention` (with `@tiptap/suggestion`); Emoji → `@tiptap/extension-emoji`; Mathematics (KaTeX) → `@tiptap/extension-mathematics` + `katex`; DragHandleReact → `@tiptap/extension-drag-handle-react` (+ `@tiptap/extension-drag-handle`, `@tiptap/extension-node-range`, `@tiptap/extension-collaboration`, `@tiptap/y-tiptap`, `yjs`, `y-protocols`) with **fallback** to `@tiptap/extension-drag-handle` if licensing/deps aren’t available.

3. Output:

* A checklist of **npm/pnpm installs** (group by feature, pin to `^3.x` where stable; call out any `next`/beta tags like `@tiptap/extension-font-size@3.0.0-next.x` if needed).
* A short “**Import Map (v3-only)**” showing **exact import names** (e.g., menus from their own extension packages; Suggestion from `@tiptap/suggestion`).
* Risks & mitigations (SSR in Next.js, Floating UI vs tippy, KaTeX CSS import, table resize edge cases, image alt/title editing).
* No code changes yet.

**Use these sources to validate v3 packages and APIs (cite in your notes):**

* FloatingMenu & BubbleMenu packages (v3): tiptap docs & npm. ([Tiptap][1], [npm][2])
* Suggestion utility & Mention: docs + npm. ([Tiptap][3], [npm][4])
* CodeBlockLowlight & lowlight: docs + npm. ([Tiptap][5], [npm][6])
* Details (3 nodes): docs. ([Tiptap][7])
* Underline, TextStyle, Color, CharacterCount, FontFamily, FontSize/TextStyleKit: docs + npm. ([Tiptap][8], [npm][9])
* Emoji, Mathematics, YouTube: docs + npm. ([Tiptap][10], [npm][11])
* DragHandle & DragHandleReact: docs + npm. ([Tiptap][12], [npm][13])
* Table: docs (resizing options). ([Tiptap][14])
* Image: docs (attributes & caveats). ([Tiptap][15])
* Tiptap v3 changes (Floating UI, Trailing Node, StarterKit expansion): docs. ([Tiptap][16])

---

# Prompt 2 — Implement the 3 Commits + New Feature Set (V3-ONLY)

**Title:** *Implement core v3 extensions, enhancements, and menus without breaking the build*

**Prompt (paste as-is):**
Read: `@/docs/monorepo-archetecture.md`, `@/docs/AI-Dev-Onboarding-Guide.md`, `@/docs/Tiptap Feature-Rich Editor Prompts.md`.
**Constraints:** Nx monorepo; Next.js app; Tailwind; Tiptap **VERSION 3** only; project currently builds & serves clean—**don’t break it**. All menu components must use v3 **extension** packages (not `@tiptap/react` exports).

### A) Commit: feat(editor)

1. Install missing **core** v3 extensions from the plan (Link, Underline, TextStyle, Color). History/GAP/Drop should come from StarterKit; ensure enabled.
2. Centralize editor config in a single `EditorKit` (or `useTiptapEditor.ts`) with **strict v3 imports**.
3. SSR safety for Next.js:

   * Place editor UI in a `use client` component.
   * Create the `Editor` instance inside `useEffect` / `useEditor` to avoid `window` on the server.
   * Avoid tippy.js; v3 uses **Floating UI** (menus are extensions). ([Tiptap][16])

### B) Commit: fix(editor)

1. **Tables**: enable resizing + header/row/cell nodes; ensure columns persist across edits; set sensible min/max widths in CSS. ([Tiptap][14])
2. **Images**: support `alt`, `title`, `width` (and optional `data-keep-ratio`), and a simple edit UI. Note v3 image doesn’t upload—keep display-only. ([Tiptap][15])
3. **CharacterCount**: add extension + small status component (characters & words). ([Tiptap][17])
4. **CodeBlockLowlight**: wire up `lowlight` and a minimal language map. ([Tiptap][5])

### C) Commit: refactor(editor)

1. **BubbleMenu** (text selection): bold/italic/underline/strike/code, link add/remove, highlight, color, sub/superscript, font family/size. **Import from `@tiptap/extension-bubble-menu`**. ([Tiptap][18])
2. **FloatingMenu** (empty line): quick insert for headings, lists, hr, blockquote, code block, image, table, details, task list, YouTube, math. **Import from `@tiptap/extension-floating-menu`**. ([Tiptap][1])
3. **Slash Menu**: implement with the **Suggestion** utility + your command list (include search/filter; fully keyboard accessible). ([Tiptap][3])

### D) Add the rest of the requested features

* **Details** (3 nodes), **TaskList/TaskItem**, **YouTube**, **Emoji**, **Mathematics** (+ `katex` CSS), **Mention** (@mentions via Suggestion), **Focus**, **Placeholder**, **TrailingNode**, **Typography**, **FontFamily** + **FontSize** (prefer `TextStyleKit` pathway; if `@tiptap/extension-font-size` is beta, isolate it). ([Tiptap][7], [npm][9])
* **DragHandleReact**: if deps available, add; otherwise fallback to `DragHandle`. Place handles left of block nodes (paragraph, headings, lists, images, tables). ([Tiptap][19])

### E) Menus & Shortcuts polish

* Add Tailwind-styled color picker and font family/size controls.
* Keyboard shortcuts parity with StarterKit; add `/` to open Slash, `@` for Mention, `:…` for Emoji.
* Accessibility: `role="toolbar"`, menu items `role="menuitem"`, focus rings, ARIA labels. ([Tiptap][20])

### F) Deliverables

* Code changes grouped into the **3 commits** above.
* Updated dependency list (exact versions).
* A short **README** section in your editor folder documenting **v3-only imports**, SSR notes, and how to extend menus.

**Reference docs while coding (don’t guess; use v3):** FloatingMenu, BubbleMenu, Suggestion, Table, Image, CharacterCount, TextStyleKit/FontSize, Details, Emoji, Mathematics, YouTube, Focus, Placeholder, TrailingNode, v3 changes. ([Tiptap][1])

---

# Prompt 3 — Verify, QA & Safety Net (No regressions)

**Title:** *Verify all prompts executed, run checks, and output a QA report*

**Prompt (paste as-is):**
Re-read: `@/docs/monorepo-archetecture.md`, `@/docs/AI-Dev-Onboarding-Guide.md`, `@/docs/Tiptap Feature-Rich Editor Prompts.md`.
Now **verify one by one** that every item below is implemented with **Tiptap v3** imports only:

1. **Imports are v3-correct**:

   * Menus from `@tiptap/extension-bubble-menu` and `@tiptap/extension-floating-menu` (NOT from `@tiptap/react`). ([Tiptap][18])
   * Slash/Mention use `@tiptap/suggestion`. ([Tiptap][3])
   * Text styling via `TextStyle` + `Color/FontFamily/FontSize` consistent with v3 docs. ([Tiptap][21], [npm][9])

2. **Feature smoke tests** (paste GIFs/screenshots optional):

   * Formatting marks in BubbleMenu; insert blocks from FloatingMenu; `/` menu filters entries; `@` resolves mentions; `:joy:` renders emoji. ([Tiptap][10])
   * Tables resize and keep widths; images edit `alt/title/width`; code blocks highlight. ([Tiptap][14])
   * Character & word counts display; Placeholder shows when empty; TrailingNode allows cursor after tables/images. ([Tiptap][17])
   * Details toggles open/closed; YouTube embeds; Math renders with KaTeX; Focus class applies. ([Tiptap][7])
   * Drag handle works or falls back gracefully. ([Tiptap][19])

3. **SSR & build checks:**

   * `pnpm typecheck && pnpm lint && pnpm build` pass.
   * No client-only code runs on the server; editor created after mount.
   * Bundle size note if large additions (CodeBlockLowlight, KaTeX).
   * Document any **beta** packages and how to swap to stable later.

4. **Output a concise QA report** with: what changed per commit; installed packages; file diffs; and a quick “how to add a new node/mark” guide. Include links to v3 docs you used. ([Tiptap][22])

---

## Quick “import map” you can mirror in your code (v3-only)

* Menus:
  `import BubbleMenu from '@tiptap/extension-bubble-menu'`
  `import FloatingMenu from '@tiptap/extension-floating-menu'` ([Tiptap][18])

* Suggest/mentions:
  `import Suggestion from '@tiptap/suggestion'`
  `import Mention from '@tiptap/extension-mention'` ([Tiptap][3])

* Styling:
  `import TextStyle from '@tiptap/extension-text-style'`
  `import Color from '@tiptap/extension-color'`
  `import Underline from '@tiptap/extension-underline'`
  `import FontFamily from '@tiptap/extension-font-family'`
  `import { FontSize, TextStyleKit } from '@tiptap/extension-text-style'` (if available) or `@tiptap/extension-font-size` (beta). ([Tiptap][21], [npm][9])

* Nodes & extras:
  `import Image from '@tiptap/extension-image'`
  `import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'`
  `import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'`
  `import Details, { DetailsContent, DetailsSummary } from '@tiptap/extension-details'`
  `import TaskList from '@tiptap/extension-task-list'`
  `import TaskItem from '@tiptap/extension-task-item'`
  `import Youtube from '@tiptap/extension-youtube'`
  `import Emoji from '@tiptap/extension-emoji'`
  `import Mathematics from '@tiptap/extension-mathematics'`
  `import Focus from '@tiptap/extension-focus'`
  `import Placeholder from '@tiptap/extension-placeholder'`
  `import TrailingNode from '@tiptap/extension-trailing-node'`
  `import Typography from '@tiptap/extension-typography'`
  `import DragHandle from '@tiptap/extension-drag-handle'`
  `import DragHandleReact from '@tiptap/extension-drag-handle-react'` (optional) ([Tiptap][15])

> Note: Tiptap v3 menus rely on **Floating UI**; do not pull tippy.js. ([Tiptap][16])

---

## Why this works (v3-proofed sources)

* **FloatingMenu/BubbleMenu as extensions (not React exports):** v3 docs + npm. ([Tiptap][1])
* **Suggestion utility & Mention/Emoji:** v3 docs & npm. ([Tiptap][3])
* **Tables, Image attributes, CharacterCount, CodeBlockLowlight:** v3 docs. ([Tiptap][14])
* **TextStyle + Color/FontFamily/FontSize/TextStyleKit:** v3 docs & npm. ([Tiptap][21], [npm][9])
* **YouTube, Mathematics (KaTeX), Details, Focus, Placeholder, TrailingNode, Typography:** v3 docs. ([Tiptap][23])
* **Drag handles:** v3 docs & npm. ([Tiptap][12])

---

### SEO angle (so your team can find this later)

**Keywords:** tiptap v3 React editor, Next.js rich text editor, ProseMirror extensions, BubbleMenu FloatingMenu v3, Suggestion mentions slash menu, code-block-lowlight, KaTeX mathematics tiptap, Tailwind WYSIWYG editor, Nx monorepo editor setup, TextStyleKit FontSize FontFamily.

If you want, I can condense these into a single “Master Prompt” too—but the three-step flow above usually yields the cleanest commits and the least risk.

[1]: https://tiptap.dev/docs/editor/extensions/functionality/floatingmenu?utm_source=chatgpt.com "FloatingMenu extension | Tiptap Editor Docs"
[2]: https://www.npmjs.com/package/%40tiptap/extension-bubble-menu?utm_source=chatgpt.com "tiptap/extension-bubble-menu"
[3]: https://tiptap.dev/docs/editor/api/utilities/suggestion?utm_source=chatgpt.com "Suggestion utility | Tiptap Editor Docs"
[4]: https://www.npmjs.com/package/%40tiptap/suggestion?utm_source=chatgpt.com "tiptap/suggestion"
[5]: https://tiptap.dev/docs/editor/extensions/nodes/code-block-lowlight?utm_source=chatgpt.com "CodeBlockLowlight extension | Tiptap Editor Docs"
[6]: https://www.npmjs.com/package/%40tiptap/extension-code-block-lowlight?activeTab=dependents&utm_source=chatgpt.com "tiptap/extension-code-block-lowlight"
[7]: https://tiptap.dev/docs/editor/extensions/nodes/details?utm_source=chatgpt.com "Details extension | Tiptap Editor Docs"
[8]: https://tiptap.dev/docs/editor/extensions/marks/underline?utm_source=chatgpt.com "Underline extension | Tiptap Editor Docs"
[9]: https://www.npmjs.com/package/%40tiptap/extension-font-family?utm_source=chatgpt.com "@tiptap/extension-font-family - npm"
[10]: https://tiptap.dev/docs/editor/extensions/nodes/emoji?utm_source=chatgpt.com "Emoji extension | Tiptap Editor Docs"
[11]: https://www.npmjs.com/package/%40tiptap/extension-emoji?utm_source=chatgpt.com "tiptap/extension-emoji"
[12]: https://tiptap.dev/docs/editor/extensions/functionality/drag-handle?utm_source=chatgpt.com "Drag Handle extension | Tiptap Editor Docs"
[13]: https://www.npmjs.com/package/%40tiptap/extension-drag-handle-react?activeTab=code&utm_source=chatgpt.com "tiptap/extension-drag-handle-react"
[14]: https://tiptap.dev/docs/editor/extensions/nodes/table?utm_source=chatgpt.com "Table extension | Tiptap Editor Docs"
[15]: https://tiptap.dev/docs/editor/extensions/nodes/image?utm_source=chatgpt.com "Image extension | Tiptap Editor Docs"
[16]: https://tiptap.dev/tiptap-editor-v3?utm_source=chatgpt.com "Tiptap Editor 3.0"
[17]: https://tiptap.dev/docs/editor/extensions/functionality/character-count?utm_source=chatgpt.com "CharacterCount extension | Tiptap Editor Docs"
[18]: https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu?utm_source=chatgpt.com "BubbleMenu extension | Tiptap Editor Docs"
[19]: https://tiptap.dev/docs/editor/extensions/functionality/drag-handle-react?utm_source=chatgpt.com "Drag Handle React extension"
[20]: https://tiptap.dev/docs/guides/accessibility?utm_source=chatgpt.com "Accessibility | Tiptap Editor Docs"
[21]: https://tiptap.dev/docs/editor/extensions/marks/text-style?utm_source=chatgpt.com "TextStyle extension | Tiptap Editor Docs"
[22]: https://tiptap.dev/docs?utm_source=chatgpt.com "Tiptap Docs"
[23]: https://tiptap.dev/docs/editor/extensions/nodes/youtube?utm_source=chatgpt.com "Youtube extension | Tiptap Editor Docs"
