// libs/editor/src/lib/components/menus/FloatingMenu.tsx
'use client';

import { FloatingMenu } from '@tiptap/extension-floating-menu';
import { EditorState } from '@tiptap/pm/state';

export const editorFloatingMenu = FloatingMenu.configure({
  element: document.createElement('div'),
  shouldShow: ({ state }: { state: EditorState }) => {
    const { $from } = state.selection;
    const isRootNode = $from.depth === 1;
    const isEmpty = $from.parent.nodeSize <= 2;
    return isRootNode && isEmpty;
  },
  options: {
    placement: 'left-start',
    offset: 8,
  },
});