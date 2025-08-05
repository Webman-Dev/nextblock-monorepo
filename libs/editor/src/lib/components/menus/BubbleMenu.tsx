// libs/editor/src/lib/components/menus/BubbleMenu.tsx
'use client';

import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  Palette,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';
import { FC, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@nextblock-monorepo/ui/popover';
import { Button } from '@nextblock-monorepo/ui/button';
import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator } from '../ui/Toolbar';

interface BubbleMenuComponentProps {
  editor: Editor;
}

const LinkEditor: FC<{ editor: Editor }> = ({ editor }) => {
  const [url, setUrl] = useState(editor.getAttributes('link').href || '');

  const handleSetLink = () => {
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
  };

  return (
    <div className="p-2 flex items-center gap-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        className="bg-background p-1 rounded border border-input text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSetLink();
          }
        }}
      />
      <Button size="sm" onClick={handleSetLink}>
        Set Link
      </Button>
    </div>
  );
};

const ColorSelector: FC<{ editor: Editor }> = ({ editor }) => {
    const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const highlights = ['#ffff00', '#ffc0cb', '#add8e6', '#90ee90', '#ffa07a'];
  
    return (
      <div className="p-2">
        <div className="mb-2">
          <p className="text-xs font-semibold mb-1">Text Color</p>
          <div className="flex gap-1">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className={`w-6 h-6 rounded-full border-2 ${editor.isActive('textStyle', { color })? 'border-primary' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <Button size="icon" variant="ghost" onClick={() => editor.chain().focus().unsetColor().run()}>X</Button>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1">Highlight</p>
          <div className="flex gap-1">
            {highlights.map((color) => (
              <button
                key={color}
                onClick={() => editor.chain().focus().setHighlight({ color }).run()}
                className={`w-6 h-6 rounded-full border-2 ${editor.isActive('highlight', { color })? 'border-primary' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <Button size="icon" variant="ghost" onClick={() => editor.chain().focus().unsetHighlight().run()}>X</Button>
          </div>
        </div>
      </div>
    );
};

export const EditorBubbleMenu: FC<BubbleMenuComponentProps> = ({ editor }) => {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor, view, state, from, to }) => {
        // Don't show for widgets or code blocks
        const { selection } = state;
        const isWidgetSelected = selection.empty && (editor.isActive('alert-widget') || editor.isActive('cta-widget'));
        return from!== to && editor.isEditable &&!editor.isActive('codeBlock') &&!isWidgetSelected;
      }}
    >
      <Toolbar>
        <ToolbarGroup>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')}>
            <Code className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <Popover>
            <PopoverTrigger asChild>
              <ToolbarButton isActive={editor.isActive('link')}>
                <Link2 className="h-4 w-4" />
              </ToolbarButton>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" side="top" align="start">
              <LinkEditor editor={editor} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <ToolbarButton isActive={editor.isActive('textStyle') || editor.isActive('highlight')}>
                <Palette className="h-4 w-4" />
              </ToolbarButton>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" side="top" align="start">
              <ColorSelector editor={editor} />
            </PopoverContent>
          </Popover>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <ToolbarButton onClick={() => editor.chain().focus().setAlertWidget({ type: 'info', title: 'Info', message: 'This is an alert widget.', align: 'left', size: 'medium', textAlign: 'left' }).run()}>
            <AlertTriangle className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setCtaWidget({ text: 'Click me', url: '#', style: 'primary', align: 'left', size: 'medium', textAlign: 'left' }).run()}>
            <Megaphone className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
    </BubbleMenu>
  );
};