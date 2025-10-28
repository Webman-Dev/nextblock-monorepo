// libs/editor/src/lib/NotionEditor.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { editorExtensions } from './kit'; // âœ… use kit
import { EditorBubbleMenu } from './components/menus/BubbleMenu'; // âœ… correct name
import { EditorFloatingMenu } from './components/menus/FloatingMenu';
import { ImageToolbar } from './components/menus/ImageToolbar';
import { TableToolbar } from './components/menus/TableToolbar';
import { EditorToolbar } from './components/menus/Toolbar';
import { cn } from '@nextblock-cms/utils';
import '../styles/drag-handle.css'; // âœ… Import enhanced drag handle styles
import '../styles/editor.css';
import type { OpenImagePicker } from './utils/mediaPicker';
import { setOpenImagePicker } from './utils/mediaPicker';

interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  showToolbar?: boolean;
  showCharacterCount?: boolean;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  openImagePicker?: OpenImagePicker;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({
  content,
  onChange,
  placeholder,
  editable = true,
  showToolbar = true,
  showCharacterCount = true,
  className,
  onFocus,
  onBlur,
  openImagePicker,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: editorExtensions,
    content,
    editable,
    immediatelyRender: false, // Next.js hydration safety
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl',
          'mx-auto focus:outline-none min-h-[500px] w-full',
          // âœ… Enhanced spacing for drag handles - proper left margin
          'pl-12 pr-4 py-4', // Left padding for drag handle space
          'prose-headings:scroll-mt-[80px] prose-headings:font-semibold',
          'prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
          'prose-p:leading-7 prose-li:leading-7',
          'prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg',
          'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
          'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4',
          'prose-table:border-collapse prose-table:border prose-table:border-border',
          'prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2',
          'prose-td:border prose-td:border-border prose-td:p-2',
          'prose-img:rounded-lg prose-img:shadow-sm'
        ),
      },
    },
  }
  );

  // Bridge the openImagePicker into editor.storage so menus/extensions can access it
  useEffect(() => {
    if (!editor) return;
    setOpenImagePicker(editor, openImagePicker);
    return () => setOpenImagePicker(editor, undefined);
  }, [editor, openImagePicker]);

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

  const characterCount = editor.storage?.characterCount;
  const characters = characterCount?.characters?.() ?? 0;
  const words = characterCount?.words?.() ?? 0;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full rounded-lg border bg-background shadow-sm",
        // Make wrapper a flex column that can host an internal scroll area
        "flex flex-col h-full min-h-0",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
    >
      {/* âœ… Enhanced Toolbar with Undo/Redo Buttons */}
      {showToolbar && <EditorToolbar editor={editor} />}

      {/* âœ… Enhanced Editor Menus */}
      <EditorBubbleMenu editor={editor} />
      <EditorFloatingMenu editor={editor} />
      <ImageToolbar editor={editor} />
      <TableToolbar editor={editor} />

      {/* Scroll only the editable content, keeping toolbars and footer visible */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* âœ… Enhanced Character Count with better styling */}
      {showCharacterCount && characterCount && (
        <div className="absolute bottom-2 right-2 text-xs z-10 text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 border">
          {characters} characters / {words} words
        </div>
      )}
    </div>
  );
};

export default NotionEditor;













