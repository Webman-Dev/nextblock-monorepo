'use client';

import React from 'react';
import type { Editor } from '@tiptap/core';
import {
  Bold, Italic, Underline, Strikethrough, Code, Link2, Palette,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  TextQuote, Code2, Image, Table2, Minus, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Subscript, Superscript, Type, Undo2,
  Redo2, Search, Download, Upload, Eye, EyeOff, MoreHorizontal,
} from 'lucide-react';
import { Button } from '@nextblock-monorepo/ui/button';
import { Separator } from '@nextblock-monorepo/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@nextblock-monorepo/ui/popover';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@nextblock-monorepo/ui/dropdown-menu';

interface EditorToolbarProps {
  editor: Editor;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}> = ({ onClick, isActive, disabled, children, title }) => (
  <Button
    variant={isActive ? 'default' : 'ghost'}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="h-8 w-8 p-0"
  >
    {children}
  </Button>
);

const FontSizeDropdown: React.FC<{ editor: Editor }> = ({ editor }) => {
  const sizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Type className="h-4 w-4 mr-1" />
          Size
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Font Size</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sizes.map((size) => (
          <DropdownMenuItem
            key={size}
            onClick={() => editor.chain().focus().setFontSize(size).run()}
          >
            {size}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => editor.chain().focus().unsetFontSize().run()}
        >
          Reset Size
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ColorPicker: React.FC<{ editor: Editor }> = ({ editor }) => {
  const colors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB',
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
    '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4',
  ];
  
  const highlights = [
    '#FEF3C7', '#FED7D7', '#D1FAE5', '#DBEAFE', '#E0E7FF',
    '#F3E8FF', '#FCE7F3', '#FEF2F2', '#F0FDF4', '#ECFDF5',
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Text Color</h4>
            <div className="grid grid-cols-5 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  className="w-8 h-8 rounded border-2 border-transparent hover:border-gray-300"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="mt-2 w-full"
            >
              Remove Color
            </Button>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Highlight</h4>
            <div className="grid grid-cols-5 gap-1">
              {highlights.map((color) => (
                <button
                  key={color}
                  onClick={() => editor.chain().focus().setHighlight({ color }).run()}
                  className="w-8 h-8 rounded border-2 border-transparent hover:border-gray-300"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              className="mt-2 w-full"
            >
              Remove Highlight
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const InsertDropdown: React.FC<{ editor: Editor }> = ({ editor }) => {
  const insertImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          Insert
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={insertImage}>
          <Image className="h-4 w-4 mr-2" />
          Image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={insertTable}>
          <Table2 className="h-4 w-4 mr-2" />
          Table
        </DropdownMenuItem>
        <DropdownMenuItem onClick={insertLink}>
          <Link2 className="h-4 w-4 mr-2" />
          Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4 mr-2" />
          Horizontal Rule
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ExportDropdown: React.FC<{ editor: Editor }> = ({ editor }) => {
  const exportHTML = () => {
    const html = editor.getHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const json = JSON.stringify(editor.getJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportText = () => {
    const text = editor.getText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportHTML}>
          Export as HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJSON}>
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportText}>
          Export as Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="border-b bg-background p-2">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Basic formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Subscript/Superscript */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          isActive={editor.isActive('subscript')}
          title="Subscript"
        >
          <Subscript className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          isActive={editor.isActive('superscript')}
          title="Superscript"
        >
          <Superscript className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task List"
        >
          <CheckSquare className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <TextQuote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Font size and colors */}
        <FontSizeDropdown editor={editor} />
        <ColorPicker editor={editor} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Insert menu */}
        <InsertDropdown editor={editor} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Export menu */}
        <ExportDropdown editor={editor} />
      </div>
    </div>
  );
};