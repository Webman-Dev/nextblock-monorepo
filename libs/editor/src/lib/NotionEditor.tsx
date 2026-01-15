// libs/editor/src/lib/NotionEditor.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import { editorExtensions } from './kit';
import { EditorBubbleMenu } from './components/menus/BubbleMenu';
import { EditorFloatingMenu } from './components/menus/FloatingMenu';
import { ImageToolbar } from './components/menus/ImageToolbar';
import { TableToolbar } from './components/menus/TableToolbar';
import { EditorToolbar } from './components/menus/Toolbar';
import { cn } from '@nextblock-cms/utils';
import '../styles/drag-handle.css';
import '../styles/editor.css';
import type { OpenImagePicker } from './utils/mediaPicker';
import { setOpenImagePicker } from './utils/mediaPicker';

interface NotionEditorProps {
  content?: string | JSONContent;
  initialContent?: string | JSONContent;
  onChange?: (content: string) => void;
  onUpdate?: (content: JSONContent) => void;
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
  initialContent,
  onChange,
  onUpdate,
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
    content: content ?? initialContent,
    editable,
    immediatelyRender: false, // Next.js hydration safety
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl',
          'mx-auto focus:outline-none min-h-[500px] w-full',
          // Space for drag handle gutter
          'pl-14 pr-4 py-4',
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
  }, []); // Stable dependency array to prevent re-initialization

  // Register event listeners
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
       onChange?.(editor.getHTML());
       onUpdate?.(editor.getJSON());
    };
    const focusHandler = () => {
       onFocus?.();
    };
    const blurHandler = () => {
       onBlur?.();
    };

    editor.on('update', updateHandler);
    editor.on('focus', focusHandler);
    editor.on('blur', blurHandler);

    return () => {
      editor.off('update', updateHandler);
      editor.off('focus', focusHandler);
      editor.off('blur', blurHandler);
    };
  }, [editor, onChange, onFocus, onBlur, onUpdate]);

  // Bridge the openImagePicker into editor.storage so menus/extensions can access it
  useEffect(() => {
    if (!editor) return;
    setOpenImagePicker(editor, openImagePicker);
    return () => setOpenImagePicker(editor, undefined);
  }, [editor, openImagePicker]);

  // Sync editable state
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Ref to track the content we've ostensibly "seen" or "generated"
  // This prevents the "echo" effect where the parent passes back what we just sent
  const lastContentRef = useRef(content);

  // Keep ref in sync with editor state
  useEffect(() => {
    if (!editor) return;
    const updateHandler = () => {
      lastContentRef.current = editor.getHTML();
    };
    editor.on('update', updateHandler);
    return () => {
      editor.off('update', updateHandler);
    };
  }, [editor]);


  // Sync content prop changes
  useEffect(() => {
    if (!editor || content === undefined) return;

    // 1. If content matches what we last knew about (either we typed it, or we just synced it),
    // then ignore. This filters out the "parent echo" updates.
    if (content === lastContentRef.current) return;

    const currentHTML = editor.getHTML();

    if (typeof content === 'string') {
       if (content === currentHTML) return;
       if (editor.isEmpty && (content === '' || content === '<p></p>')) {
          lastContentRef.current = content;
          return;
       }
       const { from, to } = editor.state.selection;
       editor.commands.setContent(content, { emitUpdate: false });
       editor.commands.setTextSelection({ from, to });
       lastContentRef.current = content;
    } else {
       // JSON content comparison is strictly reference based or we assume if it changed it's new
       // For a proper implementation we might need deep comparison, but for now assuming new reference = new content
       // This might cause loop if parent creates new object every render.
       // Ideally parent should memoize.
       // We can skip check if we assume JSON usage is mostly uncontrolled or careful.
       // But let's basic check.
       // Simplify: just set content.
       const { from, to } = editor.state.selection;
       editor.commands.setContent(content, { emitUpdate: false });
       editor.commands.setTextSelection({ from, to });
       lastContentRef.current = content;
    }

  }, [content, editor]);

  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;

    (window as any).__nextblockEditor = editor;

    return () => {
      if ((window as any).__nextblockEditor === editor) {
        delete (window as any).__nextblockEditor;
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;

    const ensureHandleAttachment = () => {
      const handle = (window as any).__dragHandleElement as HTMLElement | null;
      if (!handle) return;

      const wrapper = handle.parentElement;
      const parent = editor.view.dom.parentElement ?? editor.view.dom;

      if (wrapper && parent && !wrapper.isConnected) {
        parent.appendChild(wrapper);
      }
    };

    const handler = () => ensureHandleAttachment();

    ensureHandleAttachment();
    editor.on('selectionUpdate', handler);
    editor.on('transaction', handler);
    editor.on('focus', handler);

    const intervalId = window.setInterval(ensureHandleAttachment, 2000);

    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction', handler);
      editor.off('focus', handler);
      window.clearInterval(intervalId);
    };
  }, [editor]);

  // Ensure dragging state class is cleaned up when the editor unmounts
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('dragging');
      }
    };
  }, []);

  if (!editor) return null;

  const characterCount = editor.storage?.characterCount;
  const characters = characterCount?.characters?.() ?? 0;
  const words = characterCount?.words?.() ?? 0;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative w-full rounded-lg border bg-background shadow-sm',
        // Make wrapper a flex column that can host an internal scroll area
        'flex flex-col h-full min-h-0',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
    >
      {showToolbar && <EditorToolbar editor={editor} />}

      <EditorBubbleMenu editor={editor} />
      <EditorFloatingMenu editor={editor} />
      <ImageToolbar editor={editor} />
      <TableToolbar editor={editor} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {showCharacterCount && characterCount && (
        <div className="absolute bottom-2 right-2 text-xs z-10 text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 border">
          {characters} characters / {words} words
        </div>
      )}
    </div>
  );
};

export default NotionEditor;
