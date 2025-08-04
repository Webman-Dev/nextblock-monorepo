'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import React from 'react';
import { editorExtensions } from './extensions'; // <-- Import the central configuration

interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: editorExtensions, // <-- Use the imported extensions array
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[300px]',
      },
    },
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} />;
};

export default NotionEditor;