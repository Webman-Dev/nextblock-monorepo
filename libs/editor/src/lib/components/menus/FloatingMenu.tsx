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
  Link2,
  Code2,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';
import { Button } from '@nextblock-cms/ui/button';
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
  {
    title: 'Link',
    icon: <Link2 className="h-4 w-4" />,
    command: (e) => {
      const url = window.prompt('Enter URL:');
      if (url) {
        e.chain().focus().setLink({ href: url }).run();
      }
    },
  },
  {
    title: 'CSS Block',
    icon: <Code2 className="h-4 w-4" />,
    command: (e) => {
      const css = window.prompt('Enter CSS (without <style> tags):', '/* your styles */');
      if (css != null) {
        const content = `<style>${css}</style>`;
        e.commands.insertContentAt({ from: 0, to: 0 }, content);
      }
    },
  },
  {
    title: 'Script Block',
    icon: <Code2 className="h-4 w-4" />,
    command: (e) => {
      const js = window.prompt('Enter JavaScript (without <script> tags):', '// your script');
      if (js != null) {
        const content = `<script>${js}</script>`;
        const end = e.state.doc.content.size;
        e.commands.insertContentAt(end, content);
      }
    },
  },
  {
    title: 'DIV Block',
    icon: <Code2 className="h-4 w-4" />,
    command: (e) => {
      const className = window.prompt('Optional class for DIV:', '');
      const style = window.prompt('Optional inline style for DIV:', '');
      const text = window.prompt('Optional content for DIV:', 'New block');
      const attrs = `${className ? ` class="${className}"` : ''}${style ? ` style="${style}"` : ''}`;
      const escapeHtml = (s: string) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      const inner = text ? `<p>${escapeHtml(text)}</p>` : '<p><br /></p>';
      e.chain().focus().insertContent(`<div${attrs}>${inner}</div>`).run();
    },
  },
  {
    title: 'Alert Widget',
    icon: <AlertTriangle className="h-4 w-4" />,
    command: (e) => {
      e.chain().focus().setAlertWidget().run();
    },
  },
  {
    title: 'CTA Widget',
    icon: <Megaphone className="h-4 w-4" />,
    command: (e) => {
      e
        .chain()
        .focus()
        .setCtaWidget({ text: 'Learn more', url: '', style: 'primary', size: 'medium', textAlign: 'center' })
        .run();
    },
  },
];

interface GutterToggleDetail {
  handle: HTMLElement;
  button: HTMLElement;
}

export const EditorFloatingMenu: FC<FloatingMenuComponentProps> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Position where we will insert a new block (right after current line)
  const [insertPos, setInsertPos] = useState<number | null>(null);
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
    // Allow opening regardless of empty paragraph; only require editable state
    return true;
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

      // Compute insertion position: end of the current top-level block
      try {
        const sel: any = editor.state.selection;
        const $from = sel?.$from;
        if ($from) {
          // Find nearest block node depth to insert after (e.g., paragraph, listItem, heading)
          let depth = $from.depth;
          while (depth > 0 && !$from.node(depth)?.isBlock) {
            depth -= 1;
          }
          // Position right AFTER that block node
          const posAfterNode = typeof $from.after === 'function' ? $from.after(depth) : undefined;
          if (typeof posAfterNode === 'number') {
            setInsertPos(posAfterNode);
          } else if (typeof $from.pos === 'number') {
            // Fallback to current position if after() is unavailable
            setInsertPos($from.pos);
          } else {
            setInsertPos(null);
          }
        } else {
          setInsertPos(null);
        }
      } catch {
        setInsertPos(null);
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
      // Keep menu open as long as editor stays editable and focused
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
    // Ensure we insert right after the current line where + was clicked
    if (insertPos != null) {
      // Insert a new paragraph at the insertion point, move cursor into it,
      // then run the selected command so it applies to the new block.
      editor
        .chain()
        .focus()
        .insertContentAt(insertPos, { type: 'paragraph' })
        .setTextSelection(insertPos + 1)
        .run();
    } else {
      editor.chain().focus().run();
    }

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
      className="w-48 rounded-md bg-white p-1 shadow-lg max-h-[400px] overflow-auto"
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
