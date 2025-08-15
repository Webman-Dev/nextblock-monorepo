# Tiptap v3 Editor

This document outlines the implementation of the Tiptap v3 editor in the NextBlock CMS.

## V3-Only Imports

The editor uses Tiptap v3 exclusively. All extensions and components are imported from their respective packages, not from `@tiptap/react`.

- **BubbleMenu**: `@tiptap/extension-bubble-menu`
- **FloatingMenu**: `@tiptap/extension-floating-menu`
- **Suggestion**: `@tiptap/suggestion`

## SSR Considerations

To ensure that the editor is compatible with Next.js SSR, the following measures have been taken:

- The editor component is a `"use client"` component.
- The editor is instantiated using the `useEditor` hook to prevent `window` access on the server.