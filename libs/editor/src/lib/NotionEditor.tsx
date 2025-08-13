// libs/editor/src/lib/NotionEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import React from 'react';
import { editorExtensions } from './extensions';
import { EditorBubbleMenu } from './components/menus/BubbleMenu';
import CharacterCount from '@tiptap/extension-character-count';

interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [...editorExtensions, CharacterCount], // Add CharacterCount here if not already global
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
      <EditorContent editor={editor} />
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
        {editor.storage.characterCount.characters()} characters / {editor.storage.characterCount.words()} words
      </div>
    </div>
  );
};

export default NotionEditor;