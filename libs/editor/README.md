# Tiptap v3 Editor

This directory contains the Tiptap v3 editor implementation for the Nextblock monorepo.

## V3-Only Imports

All Tiptap extensions are imported using v3-style default imports, for example:

```ts
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
```

## SSR Safety

The editor is implemented with SSR safety in mind for Next.js applications. This is achieved by:

- Placing the editor UI in a `"use client"` component.
- Creating the `Editor` instance inside the `useEditor` hook to avoid `window` access on the server.
- Using portals to render the `BubbleMenu` and `FloatingMenu` UI, which are controlled by their respective extensions.
