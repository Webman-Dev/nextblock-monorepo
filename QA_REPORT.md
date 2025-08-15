# QA Report: Tiptap v3 Editor Implementation

## 1. Summary of Commits

### `feat(editor): Add missing core extensions`
- Added `Link`, `Underline`, `TextStyle`, and `Color` extensions.
- Centralized editor configuration in `libs/editor/src/lib/kit.ts`.
- Ensured SSR safety by placing the editor in a `"use client"` component and creating the editor instance within the `useEditor` hook.

### `fix(editor): Enhance extensions`
- Enabled table resizing.
- Extended the `Image` node to support `alt`, `title`, and `width` attributes.
- Added the `CharacterCount` extension.
- Configured `CodeBlockLowlight` with `lowlight` and a minimal language map.

### `refactor(editor): Update Bubble, Floating & Slash menus for new features`
- Implemented `BubbleMenu` and `FloatingMenu` using the correct v3 extension packages.
- Implemented the Slash command, Mention, and Emoji features using the `@tiptap/suggestion` utility.

## 2. New Packages Installed

- `@tiptap/extension-bubble-menu`
- `@tiptap/extension-floating-menu`
- `@tiptap/suggestion`
- `@tiptap/extension-link`
- `@tiptap/extension-underline`
- `@tiptap/extension-text-style`
- `@tiptap/extension-color`
- `@tiptap/extension-font-family`
- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-header`
- `@tiptap/extension-table-cell`
- `@tiptap/extension-image`
- `@tiptap/extension-code-block-lowlight`
- `lowlight`
- `@tiptap/extension-details`
- `@tiptap/extension-task-list`
- `@tiptap/extension-task-item`
- `@tiptap/extension-youtube`
- `@tiptap/extension-character-count`
- `@tiptap/extension-emoji`
- `@tiptap/extension-mention`
- `@tiptap/extension-focus`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-typography`
- `@tiptap/extension-mathematics`
- `katex`
- `@tiptap/extension-drag-handle-react`

## 3. Verification Checks

All verification checks have passed. The implementation adheres to Tiptap v3 patterns and best practices.

## 4. How to Extend the Editor

The editor can be extended by adding new extensions to the `editorExtensions` array in `libs/editor/src/lib/kit.ts`.

### Adding a New Node or Mark

1.  Install the extension package from npm.
2.  Import the extension in `libs/editor/src/lib/kit.ts`.
3.  Add the extension to the `editorExtensions` array.
4.  If the extension requires a menu button, add it to the `BubbleMenu.tsx` or `FloatingMenu.tsx` component.

### Example: Adding the `Subscript` Extension

1.  Install the package: `npm i @tiptap/extension-subscript`
2.  Import the extension in `libs/editor/src/lib/kit.ts`:
    ```ts
    import Subscript from '@tiptap/extension-subscript'
    ```
3.  Add the extension to the `editorExtensions` array:
    ```ts
    export const editorExtensions: Extensions = [
      // ...
      Subscript,
      // ...
    ]