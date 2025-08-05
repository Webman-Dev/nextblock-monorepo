 // libs/editor/src/lib/NotionEditor.tsx
'use client';

import '../../src/styles/placeholder.css';

import { useEditor, EditorContent } from '@tiptap/react';
import React, { useState, useEffect } from 'react';
import { editorExtensions, getAsyncExtensions } from './extensions';
import { EditorBubbleMenu } from './components/menus/BubbleMenu';

interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({ content, onChange }) => {
  const [currentExtensions, setCurrentExtensions] = useState(editorExtensions);

  useEffect(() => {
    const loadExtensions = async () => {
      const asyncExtensions = await getAsyncExtensions();
      setCurrentExtensions([...editorExtensions, ...asyncExtensions]);
    };
    loadExtensions();
  }, []);

  const editor = useEditor({
    extensions: currentExtensions,
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[300px]',
      },
    },
  });

  return (
    <div className="relative">
      {editor && <EditorBubbleMenu editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};

export default NotionEditor;