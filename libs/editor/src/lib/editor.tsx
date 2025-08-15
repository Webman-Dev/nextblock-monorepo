'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { editorExtensions } from './kit';
import { EditorBubbleMenu } from './components/menus/BubbleMenu';
import { EditorFloatingMenu } from './components/menus/FloatingMenu';

interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: editorExtensions, // CharacterCount should already be included in kit
    content,
    immediatelyRender: false, // ✅ v3 + Next.js hydration safety
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl ' +
          'mx-auto focus:outline-none p-4 min-h-[500px] w-full',
      },
    },
  });

  // If the incoming `content` prop changes (e.g., load draft), sync it.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      // Avoid moving the cursor unexpectedly; keep selection when possible
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, { emitUpdate: false })
      editor.commands.setTextSelection({ from, to });
    }
  }, [content, editor]);

  if (!editor) return null;

  const cc = (editor.storage?.characterCount as any) || null;
  const characters = cc?.characters?.() ?? 0;
  const words = cc?.words?.() ?? 0;

  return (
    <div className="relative w-full rounded-lg border bg-background shadow-sm">
      <EditorBubbleMenu editor={editor} />
      <EditorFloatingMenu editor={editor} />
      <EditorContent editor={editor} />
      {cc && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {characters} characters / {words} words
        </div>
      )}
    </div>
  );
};

export default NotionEditor;
