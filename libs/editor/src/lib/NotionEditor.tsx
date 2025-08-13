// libs/editor/src/lib/NotionEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { FloatingMenu } from '@tiptap/react/menus';
import React, { useState, useEffect } from 'react';
import { editorExtensions, getAsyncExtensions } from './extensions';
import { EditorBubbleMenu } from './components/menus/BubbleMenu';
import { EditorFloatingMenu } from './components/menus/FloatingMenu';
import CharacterCount from '@tiptap/extension-character-count';
import { type Extension } from '@tiptap/core';

interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({ content, onChange }) => {
  const [extensions, setExtensions] = useState<any[]>(editorExtensions);

  useEffect(() => {
    const loadAsyncExtensions = async () => {
      const asyncExtensions = await getAsyncExtensions();
      setExtensions([...editorExtensions, ...asyncExtensions]);
    };
    loadAsyncExtensions();
  }, []);

  const editor = useEditor({
    extensions: extensions,
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4 min-h-[500px] w-full',
      },
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full rounded-lg border bg-background shadow-sm">
      <EditorBubbleMenu editor={editor} />
      
      <FloatingMenu
        editor={editor}
        shouldShow={({ state }) => {
          const { $from } = state.selection;
          const isRootNode = $from.depth === 1;
          const isEmpty = $from.parent.nodeSize <= 2;
          return isRootNode && isEmpty && editor.isEditable;
        }}
      >
        <EditorFloatingMenu editor={editor} />
      </FloatingMenu>
      
      <EditorContent editor={editor} />
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
        {editor.storage.characterCount.characters()} characters / {editor.storage.characterCount.words()} words
      </div>
    </div>
  );
};

export default NotionEditor;