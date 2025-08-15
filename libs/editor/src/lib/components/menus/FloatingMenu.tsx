'use client';

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Heading1, Heading2, List, ListOrdered, TextQuote, Code, Image as ImageIcon, Table2, Minus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@nextblock-monorepo/ui/popover';
import { Button } from '@nextblock-monorepo/ui/button';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';

interface FloatingMenuComponentProps {
  editor: Editor;
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

export const EditorFloatingMenu: FC<FloatingMenuComponentProps> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const { x, y, refs, strategy, update } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const shouldShowAtSelection = useMemo(() => {
    const { state } = editor;
    const { $from } = state.selection;
    const isRootNode = $from.depth === 1;
    const isEmpty = $from.parent.nodeSize <= 2;
    return isRootNode && isEmpty && editor.isEditable;
  }, [editor]);

  const setVirtualReferenceToSelection = React.useCallback(() => {
    const { state, view } = editor;
    const from = state.selection.from;
    const rect = view.coordsAtPos(from);
    const virtualEl = { getBoundingClientRect: () => new DOMRect(rect.left, rect.top, 0, 0) };
    refs.setPositionReference(virtualEl as any);
    void update();
  }, [editor, refs, update]);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      if (shouldShowAtSelection) {
        setVirtualReferenceToSelection();
        setOpen(true);
      } else {
        setOpen(false);
      }
    };

    const handleBlur = () => setOpen(false);               // 🔧 named handler
    // initial check
    handleSelectionChange();

    editor.on('selectionUpdate', handleSelectionChange);
    editor.on('transaction', handleSelectionChange);
    editor.on('focus', handleSelectionChange);
    editor.on('blur', handleBlur);                          // 🔧 same ref for off()

    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
      editor.off('transaction', handleSelectionChange);
      editor.off('focus', handleSelectionChange);
      editor.off('blur', handleBlur);                       // 🔧 properly removed
    };
  }, [editor, shouldShowAtSelection, setVirtualReferenceToSelection]);

  const runCommand = (command: (editor: Editor) => void) => {
    command(editor);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          ref={refs.setReference}
          // 🔧 prevent editor blur which would immediately close the menu
          onMouseDown={(e) => e.preventDefault()}
          style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
        >
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" aria-label="Insert block">
            +
          </Button>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-48 p-1" ref={refs.setFloating}>
        <div className="flex flex-col">
          {menuItems.map((item) => (
            <Button
              key={item.title}
              variant="ghost"
              className="justify-start"
              onMouseDown={(e) => e.preventDefault()} // keep focus in editor
              onClick={() => runCommand(item.command)}
            >
              {item.icon}
              <span className="ml-2">{item.title}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
