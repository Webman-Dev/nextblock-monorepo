'use client';
import { getOpenImagePicker } from "../../utils/mediaPicker";
import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Heading1,
  Heading2,
  List,
  ListOrdered,
  TextQuote,
  Code,
  Image as ImageIcon,
  Table2,
  Minus,
} from 'lucide-react';
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
    command: async (e) => {
      const opener = getOpenImagePicker(e);
      if (opener) {
        const res = await opener();
        if (res?.src) {
          e
            .chain()
            .focus()
            .setImage({ src: res.src, alt: res.alt || undefined })
            .updateAttributes('image', { blurDataURL: res.blurDataURL || undefined })
            .run();
        }
        return;
      }
      const url = window.prompt('URL');
      if (url) e.chain().focus().setImage({ src: url }).run();
    },
  },
  { title: 'Table', icon: <Table2 className="h-4 w-4" />, command: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: 'Horizontal Rule', icon: <Minus className="h-4 w-4" />, command: (e) => e.chain().focus().setHorizontalRule().run() },
];

interface GutterToggleDetail {
  handle: HTMLElement;
  button: HTMLElement;
}

export const EditorFloatingMenu: FC<FloatingMenuComponentProps> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLElement | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);

  const closeMenu = useCallback(() => {
    if (buttonRef.current) {
      buttonRef.current.setAttribute('aria-expanded', 'false');
    }
    if (handleRef.current) {
      handleRef.current.removeAttribute('data-menu-open');
    }
    buttonRef.current = null;
    handleRef.current = null;
    setAnchor(null);
    setOpen(false);
  }, []);

  const { x, y, refs, strategy } = useFloating({
    placement: 'right-start',
    open,
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (anchor) {
      refs.setReference(anchor);
    } else {
      refs.setReference(null);
    }
  }, [anchor, refs]);

  const shouldShowTrigger = useCallback(() => {
    if (!editor || !editor.isEditable) {
      return false;
    }
    if (editor.isActive('image')) {
      return false;
    }
    const { $from } = editor.state.selection as any;
    const parent = $from?.parent;
    const isEmptyParagraph = parent?.type?.name === 'paragraph' && parent?.content?.size === 0;
    return Boolean(isEmptyParagraph);
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const container = editor.view.dom.parentElement;
    if (!container) {
      return;
    }

    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent<GutterToggleDetail>;
      const { handle, button } = customEvent.detail;

      if (!shouldShowTrigger()) {
        closeMenu();
        return;
      }

      if (buttonRef.current === button && openRef.current) {
        closeMenu();
        return;
      }

      if (buttonRef.current && buttonRef.current !== button) {
        buttonRef.current.setAttribute('aria-expanded', 'false');
      }

      if (handleRef.current && handleRef.current !== handle) {
        handleRef.current.removeAttribute('data-menu-open');
      }

      buttonRef.current = button;
      handleRef.current = handle;

      button.setAttribute('aria-expanded', 'true');
      handle.setAttribute('data-menu-open', 'true');

      setAnchor(button);
      setOpen(true);
    };

    container.addEventListener('tiptap-gutter-toggle', handleToggle as EventListener);

    return () => {
      container.removeEventListener('tiptap-gutter-toggle', handleToggle as EventListener);
    };
  }, [editor, shouldShowTrigger, closeMenu]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const ensureVisibility = () => {
      if (!shouldShowTrigger()) {
        closeMenu();
      }
    };

    editor.on('selectionUpdate', ensureVisibility);
    editor.on('transaction', ensureVisibility);
    editor.on('blur', closeMenu);

    return () => {
      editor.off('selectionUpdate', ensureVisibility);
      editor.off('transaction', ensureVisibility);
      editor.off('blur', closeMenu);
    };
  }, [editor, shouldShowTrigger, closeMenu]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const floating = refs.floating.current;
      if (floating && !floating.contains(target)) {
        const button = buttonRef.current;
        if (!button || !button.contains(target)) {
          closeMenu();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeMenu, refs]);

  const runCommand = (command: (editor: Editor) => void) => {
    command(editor);
    closeMenu();
  };

  if (!anchor || !open) {
    return null;
  }

  return (
    <div
      ref={refs.setFloating}
      style={{ position: strategy, top: y ?? 0, left: x ?? 0, zIndex: 10001 }}
      className="w-48 rounded-md bg-white p-1 shadow-lg"
      onMouseDown={(event) => event.preventDefault()}
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
  );
};
