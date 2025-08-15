// libs/editor/src/lib/NotionEditor.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { editorExtensions } from './kit'; // ✅ use kit
import { EditorBubbleMenu } from './components/menus/BubbleMenu'; // ✅ correct name
import { EditorFloatingMenu } from './components/menus/FloatingMenu'; // ✅ correct name

interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({ content, onChange }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: editorExtensions,
    content,
    immediatelyRender: false, // Next.js hydration safety
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl ' +
          'mx-auto focus:outline-none p-4 min-h-[500px] w-full',
      },
    },
  });

  // Optional: keep editor in sync if `content` prop changes (e.g., loading a draft)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, { emitUpdate: false }); // v3 options object
      editor.commands.setTextSelection({ from, to });
    }
  }, [content, editor]);

  if (!editor) return null;

  const cc = (editor.storage?.characterCount as any) || null;
  const characters = cc?.characters?.() ?? 0;
  const words = cc?.words?.() ?? 0;

  return (
    <div ref={wrapperRef} className="relative w-full rounded-lg border bg-background shadow-sm">
      <EditorBubbleMenu editor={editor} />
      <EditorFloatingMenu editor={editor} wrapperRef={wrapperRef} />
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
