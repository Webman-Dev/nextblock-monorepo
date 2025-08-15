'use client';

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  Bold, Italic, Underline, Strikethrough, Code, Link2, Palette, AlertTriangle, Megaphone,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@nextblock-monorepo/ui/popover';
import { Button } from '@nextblock-monorepo/ui/button';

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

/** Text color + highlight picker */
const ColorSelector: FC<{ editor: Editor }> = ({ editor }) => {
  const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const highlights = ['#ffff00', '#ffc0cb', '#add8e6', '#90ee90', '#ffa07a'];

  return (
    <div className="p-2" onMouseDown={(e) => e.preventDefault() /* 🔧 keep focus */}>
      <div className="mb-2">
        <p className="text-xs font-semibold mb-1">Text Color</p>
        <div className="flex gap-1">
          {colors.map((color) => (
            <button
              key={color}
              type="button" /* 🔧 */
              onClick={() => editor.chain().focus().setColor(color).run()}
              className={`w-6 h-6 rounded-full border-2 ${
                editor.isActive('textStyle', { color }) ? 'border-primary' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Set text color ${color}`}
              title={`Text color ${color}`}
            />
          ))}
          <Button type="button" size="icon" variant="ghost" onClick={() => editor.chain().focus().unsetColor().run()}>
            X
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1">Highlight</p>
        <div className="flex gap-1">
          {highlights.map((color) => (
            <button
              key={color}
              type="button" /* 🔧 */
              onClick={() => editor.chain().focus().setHighlight({ color }).run()}
              className={`w-6 h-6 rounded-full border-2 ${
                editor.isActive('highlight', { color }) ? 'border-primary' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Set highlight ${color}`}
              title={`Highlight ${color}`}
            />
          ))}
          <Button type="button" size="icon" variant="ghost" onClick={() => editor.chain().focus().unsetHighlight().run()}>
            X
          </Button>
        </div>
      </div>
    </div>
  );
};

export const EditorBubbleMenu: FC<BubbleMenuComponentProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', strategy: 'absolute', offset: 6 }}
      shouldShow={({ editor, state, from, to }) => {
        const isRange = from !== to;
        const inCode = editor.isActive('codeBlock');
        const selection = state.selection;
        const isWidgetSelected = selection.empty && (editor.isActive('alert-widget') || editor.isActive('cta-widget'));
        return isRange && editor.isEditable && !inCode && !isWidgetSelected;
      }}
    >
      <div className="flex gap-1 items-center" onMouseDown={(e) => e.preventDefault() /* 🔧 keep selection */}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} aria-label="Bold" title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} aria-label="Italic" title="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'is-active' : ''} aria-label="Underline" title="Underline">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} aria-label="Strikethrough" title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'is-active' : ''} aria-label="Inline code" title="Inline code">
          <Code className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 h-5" />

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={editor.isActive('link') ? 'is-active' : ''} aria-label="Link" title="Link" onMouseDown={(e) => e.preventDefault() /* 🔧 */}>
              <Link2 className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" side="top" align="start">
            <LinkEditor editor={editor} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={editor.isActive('textStyle') || editor.isActive('highlight') ? 'is-active' : ''}
              aria-label="Color / highlight"
              title="Color / highlight"
              onMouseDown={(e) => e.preventDefault() /* 🔧 */}
            >
              <Palette className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" side="top" align="start">
            <ColorSelector editor={editor} />
          </PopoverContent>
        </Popover>

        <div className="w-px bg-gray-300 h-5" />

        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setAlertWidget().run()} aria-label="Insert alert" title="Insert alert">
          <AlertTriangle className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            editor
              .chain()
              .focus()
              .setCtaWidget({ text: 'Learn more', url: '', style: 'primary', align: 'block', size: 'md', textAlign: 'center' })
              .run()
          }
          aria-label="Insert CTA"
          title="Insert CTA"
        >
          <Megaphone className="h-4 w-4" />
        </button>
      </div>
    </BubbleMenu>
  );
};
