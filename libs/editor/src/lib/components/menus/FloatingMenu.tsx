'use client';

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Heading1, Heading2, List, ListOrdered, TextQuote, Code,
  Image as ImageIcon, Table2, Minus, PlusCircle,
} from 'lucide-react';
import { Button } from '@nextblock-monorepo/ui/button';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';

interface FloatingMenuComponentProps {
  editor: Editor;
  wrapperRef?:
    | React.RefObject<HTMLDivElement>
    | React.RefObject<HTMLDivElement | null>;
}

type MenuItem = {
  title: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
};

const menuItems: MenuItem[] = [
  { title: 'Heading 1', icon: <Heading1 className="h-4 w-4" />, command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: 'Heading 2', icon: <Heading2 className="h-4 w-4" />, command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: 'Bullet List', icon: <List className="h-4 w-4" />, command: (e) => e.chain().focus().toggleBulletList().run() },
  { title: 'Ordered List', icon: <ListOrdered className="h-4 w-4" />, command: (e) => e.chain().focus().toggleOrderedList().run() },
  { title: 'Blockquote', icon: <TextQuote className="h-4 w-4" />, command: (e) => e.chain().focus().toggleBlockquote().run() },
  { title: 'Code Block', icon: <Code className="h-4 w-4" />, command: (e) => e.chain().focus().toggleCodeBlock().run() },
  {
    title: 'Image',
    icon: <ImageIcon className="h-4 w-4" />,
    command: (e) => {
      const url = window.prompt('URL');
      if (url) e.chain().focus().setImage({ src: url }).run();
    },
  },
  { title: 'Table', icon: <Table2 className="h-4 w-4" />, command: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: 'Horizontal Rule', icon: <Minus className="h-4 w-4" />, command: (e) => e.chain().focus().setHorizontalRule().run() },
];

export const EditorFloatingMenu: FC<FloatingMenuComponentProps> = ({ editor, wrapperRef }) => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [triggerStyle, setTriggerStyle] = useState<{ top: number; left: number; width: number }>({
    top: -9999,
    left: -9999,
    width: 0,
  });

  const { x, y, refs, strategy, update } = useFloating({
    placement: 'right-start',
    open,
    onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Stable predicate for visibility (empty paragraph && editable)
  const shouldShowTrigger = useCallback(() => {
    const { $from } = editor.state.selection;
    const parent = $from.parent;
    const isEmptyPara = parent.type.name === 'paragraph' && parent.content.size === 0;
    return isEmptyPara && editor.isEditable;
  }, [editor]);

  // Stable positioning function based on caret coords
  const positionTrigger = useCallback(() => {
    if (!wrapperRef?.current) return;

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const editorContentRect = editor.view.dom.getBoundingClientRect();
    const caretRect = editor.view.coordsAtPos(editor.state.selection.from);

    const top = caretRect.top - wrapperRect.top;
    const left = editorContentRect.left - wrapperRect.left;
    const width = editorContentRect.width;

    setTriggerStyle({ top, left, width });

    update();
    requestAnimationFrame(() => setReady(true));
  }, [editor, update, wrapperRef]);

  useEffect(() => {
    if (!editor) return;

    let raf = 0;
    const handle = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (shouldShowTrigger()) {
          setVisible(true);
          setReady(false);
          positionTrigger();
        } else {
          setVisible(false);
          setOpen(false);
          setReady(false);
        }
      });
    };

    const handleBlur = () => {
      setVisible(false);
      setOpen(false);
      setReady(false);
    };

    // initial run
    handle();

    editor.on('selectionUpdate', handle);
    editor.on('transaction', handle);
    editor.on('focus', handle);
    editor.on('blur', handleBlur);

    return () => {
      cancelAnimationFrame(raf);
      editor.off('selectionUpdate', handle);
      editor.off('transaction', handle);
      editor.off('focus', handle);
      editor.off('blur', handleBlur);
    };
  }, [editor, shouldShowTrigger, positionTrigger]);

  const runCommand = (command: (editor: Editor) => void) => {
    command(editor);
    setOpen(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Trigger */}
      <div
        style={{
          position: 'absolute',
          top: triggerStyle.top,
          left: triggerStyle.left,
          width: triggerStyle.width,
          visibility: ready ? 'visible' : 'hidden',
          zIndex: 10000,
        }}
        className="group"
      >
        <div className="relative py-4 w-[95%] mx-auto flex items-center" aria-label="Insert block">
          {/* Horizontal Line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-700 transform origin-center scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100 transition-all duration-300" />
          {/* Plus Icon and Animated Circle */}
          <div
            ref={refs.setReference}
            className="relative z-10 cursor-pointer mx-auto"
            onClick={() => setOpen((v) => !v)}
          >
            {/* Animated Circle */}
            <div className="absolute -inset-2 rounded-full bg-primary/10 dark:bg-primary/30 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-in-out" />
            {/* Plus Icon Container */}
            <div className="relative bg-background p-1 rounded-full">
              <PlusCircle className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      {open && (
        <div
          ref={refs.setFloating}
          style={{ position: strategy, top: y ?? 0, left: x ?? 0, zIndex: 10001 }}
          className="bg-white shadow-lg rounded-md p-1 w-48"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            {menuItems.map((item) => (
              <Button
                key={item.title}
                type="button"
                variant="ghost"
                className="justify-start"
                onClick={() => runCommand(item.command)}
              >
                {item.icon}
                <span className="ml-2">{item.title}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
