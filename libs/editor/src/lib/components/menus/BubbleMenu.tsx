'use client';

import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { NodeSelection } from 'prosemirror-state';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Link2, Palette,
  Subscript, Superscript, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@nextblock-cms/ui/popover';
import { Button } from '@nextblock-cms/ui/button';
import { AdvancedColorMenu } from '../ui/AdvancedColorMenu';
import { AdvancedFontSizeMenu } from '../ui/AdvancedFontSizeMenu';

interface BubbleMenuComponentProps {
  editor: Editor;
}

/** Inline link editor */
const LinkEditor: FC<{ editor: Editor }> = ({ editor }) => {
  const [url, setUrl] = useState<string>(editor.getAttributes('link')?.href ?? '');

  // 🔧 keep input in sync with selection’s link mark
  useEffect(() => {
    const handler = () => {
      setUrl(editor.getAttributes('link')?.href ?? '');
    };
    editor.on('selectionUpdate', handler);
    editor.on('transaction', handler);
    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction', handler);
    };
  }, [editor]);

  const handleSetLink = () => {
    const value = url.trim();
    if (value) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
  };

  return (
    <div className="p-2 flex items-center gap-2" onMouseDown={(e) => e.preventDefault() /* 🔧 keep focus in editor */}>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        className="bg-background p-1 rounded border border-input text-sm"
        onKeyDown={(e) => e.key === 'Enter' && handleSetLink()}
      />
      <Button type="button" size="sm" onClick={handleSetLink}>
        Set Link
      </Button>
    </div>
  );
};

/** Rich color menu shared with the main toolbar */
const ColorSelector: FC<{ editor: Editor }> = ({ editor }) => (
  <div className="w-[380px]">
    <AdvancedColorMenu
      editor={editor}
      className="p-4"
      initialMode={editor.isActive('highlight') ? 'highlight' : 'text'}
    />
  </div>
);


export const EditorBubbleMenu: FC<BubbleMenuComponentProps> = ({ editor }) => {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);

  const { x, y, refs, strategy, update } = useFloating({
    placement: 'top',
    middleware: [offset(6), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Stable predicate for visibility based on text selection
  const shouldShowBubbleMenu = useCallback(() => {
    if (!editor || !editor.isEditable) return false;

    const { state } = editor;
    const { from, to } = state.selection as any;
    const isRange = from !== to;
    const isNodeSel = state.selection instanceof NodeSelection;
    const inCode = editor.isActive('codeBlock');
    const isWidgetSelected = state.selection.empty && (editor.isActive('alert-widget') || editor.isActive('cta-widget'));
    const onImage = editor.isActive('image');

    return isRange && !isNodeSel && !inCode && !isWidgetSelected && !onImage;
  }, [editor]);

  // Position bubble menu based on text selection
  const positionBubbleMenu = useCallback(() => {
    if (!editor || !shouldShowBubbleMenu()) return;
    
    try {
      const { from, to } = editor.state.selection;
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      
      // Create virtual reference element for floating-ui
      const virtualReference = {
        getBoundingClientRect: () => ({
          x: start.left,
          y: start.top,
          top: start.top,
          left: start.left,
          bottom: end.bottom,
          right: end.right,
          width: end.right - start.left,
          height: end.bottom - start.top,
        }),
      };
      
      refs.setReference(virtualReference);
      update();
      requestAnimationFrame(() => setReady(true));
    } catch (error) {
      console.warn('BubbleMenu positioning error:', error);
    }
  }, [editor, refs, update, shouldShowBubbleMenu]);

  useEffect(() => {
    if (!editor) return;

    let raf = 0;
    const handleUpdate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (shouldShowBubbleMenu()) {
          setVisible(true);
          positionBubbleMenu();
        } else {
          if (!isColorMenuOpen && !isFontMenuOpen) setVisible(false);
        }
      });
    };

    const handleBlur = ({ event }: { event: FocusEvent }) => {
      if (isColorMenuOpen || isFontMenuOpen) return;
      if (refs.floating.current && event.relatedTarget && refs.floating.current.contains(event.relatedTarget as Node)) {
        return;
      }
      setVisible(false);
    };

    // Initial run
    handleUpdate();

    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);
    editor.on('focus', handleUpdate);
    editor.on('blur', handleBlur);

    return () => {
      cancelAnimationFrame(raf);
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
      editor.off('focus', handleUpdate);
      editor.off('blur', handleBlur);
    };
  }, [editor, shouldShowBubbleMenu, positionBubbleMenu, isColorMenuOpen, isFontMenuOpen, refs.floating]);

  if (!editor || !visible) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        zIndex: 10000,
        visibility: ready ? 'visible' : 'hidden',
      }}
      className="flex gap-1 items-center bg-background border rounded-lg p-1 shadow-lg"
      onMouseDown={(e) => e.preventDefault() /* 🔧 keep selection */}
    >
        {/* Basic formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('bold') ? 'bg-accent' : ''}`}
          aria-label="Bold"
          title="Bold"
        >
          <Bold className="h-4 w-4 pointer-events-none" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('italic') ? 'bg-accent' : ''}`} aria-label="Italic" title="Italic">
          <Italic className="h-4 w-4 pointer-events-none" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('underline') ? 'bg-accent' : ''}`} aria-label="Underline" title="Underline">
          <Underline className="h-4 w-4 pointer-events-none" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('strike') ? 'bg-accent' : ''}`} aria-label="Strikethrough" title="Strikethrough">
          <Strikethrough className="h-4 w-4 pointer-events-none" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('code') ? 'bg-accent' : ''}`} aria-label="Inline code" title="Inline code">
          <Code className="h-4 w-4 pointer-events-none" />
        </button>

        <div className="w-px bg-border h-5" />

        {/* Subscript/Superscript */}
        <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('subscript') ? 'bg-accent' : ''}`} aria-label="Subscript" title="Subscript">
          <Subscript className="h-4 w-4 pointer-events-none" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('superscript') ? 'bg-accent' : ''}`} aria-label="Superscript" title="Superscript">
          <Superscript className="h-4 w-4 pointer-events-none" />
        </button>

        <div className="w-px bg-border h-5" />

        {/* Text alignment */}
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive({ textAlign: 'left' }) ? 'bg-accent' : ''}`} aria-label="Align left" title="Align left">
          <AlignLeft className="h-4 w-4 pointer-events-none" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive({ textAlign: 'center' }) ? 'bg-accent' : ''}`} aria-label="Align center" title="Align center">
          <AlignCenter className="h-4 w-4 pointer-events-none" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive({ textAlign: 'right' }) ? 'bg-accent' : ''}`} aria-label="Align right" title="Align right">
          <AlignRight className="h-4 w-4 pointer-events-none" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive({ textAlign: 'justify' }) ? 'bg-accent' : ''}`} aria-label="Justify" title="Justify">
          <AlignJustify className="h-4 w-4 pointer-events-none" />
        </button>

        <div className="w-px bg-border h-5" />

        {/* Font size */}
        <Popover open={isFontMenuOpen} onOpenChange={setIsFontMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center"
              aria-label="Font size"
              title="Font size"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Type className="h-4 w-4 pointer-events-none" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            onFocusOutside={(e: Event) => e.preventDefault()}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            className="w-[360px] p-0"
            side="top"
            align="start"
          >
            <AdvancedFontSizeMenu editor={editor} className="p-4" />
          </PopoverContent>
        </Popover>

        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('link') ? 'bg-accent' : ''}`} aria-label="Link" title="Link" onMouseDown={(e) => e.preventDefault()}>
              <Link2 className="h-4 w-4 pointer-events-none" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" side="top" align="start">
            <LinkEditor editor={editor} />
          </PopoverContent>
        </Popover>

        {/* Color and highlight */}
        <Popover open={isColorMenuOpen} onOpenChange={setIsColorMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className={`p-1.5 rounded hover:bg-accent transition-colors duration-100 flex items-center justify-center ${editor.isActive('textStyle') || editor.isActive('highlight') ? 'bg-accent' : ''}`}
              aria-label="Color / highlight"
              title="Color / highlight"
            >
              <Palette className="h-4 w-4 pointer-events-none" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            onFocusOutside={(e: Event) => e.preventDefault()}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            className="w-auto p-0"
            side="top"
            align="start"
          >
            <ColorSelector editor={editor} />
          </PopoverContent>
        </Popover>

        <div className="w-px bg-border h-5" />

        {/** Custom widgets moved to Toolbar Insert menu */}
    </div>
  );
};



