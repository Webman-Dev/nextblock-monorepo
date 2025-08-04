'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import React, { useEffect, useRef } from 'react';
import { editorExtensions } from './extensions';
import '../styles/placeholder.css';

interface NotionEditorProps {
  content: string | undefined | null;
  onChange: (content: string) => void;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({
  content,
  onChange,
}) => {
  const editor = useEditor({
    extensions: editorExtensions,
    immediatelyRender: false,
    content: content || '', // Ensure content is always a string for initialization
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[300px]',
      },
    },
  });

  const isInitialRender = useRef(true);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    // Let useEditor handle the initial content, and only sync on subsequent changes.
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const editorContent = editor.getHTML();
    const newContent = content || '';

    // More robust check for empty content
    const isNewContentEmpty = newContent === '' || newContent === '<p></p>';
    const isEditorEmpty = editorContent === '' || editorContent === '<p></p>';

    // Prevent unnecessary updates if both are empty
    if (isNewContentEmpty && isEditorEmpty) {
      return;
    }

    // Update content if it differs
    if (editorContent !== newContent) {
      editor.commands.setContent(newContent, { emitUpdate: false });
    }
  }, [content, editor]);

  return <EditorContent editor={editor} />;
};

export default NotionEditor;