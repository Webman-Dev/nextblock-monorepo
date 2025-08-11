"use client";

import React from 'react';
import dynamic from 'next/dynamic'; // Import dynamic
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Undo, Redo, Pilcrow, Palette, Baseline, FileCode, X as XIcon, AlertTriangle, Link
} from 'lucide-react';
import { Button } from '@nextblock-monorepo/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@nextblock-monorepo/ui';
// import { MediaLibraryModal } from './MediaLibraryModal'; // Will be dynamically imported

// Dynamically import MediaLibraryModal
const MediaLibraryModal = dynamic(() =>
  import('./MediaLibraryModal.js').then((mod) => mod.MediaLibraryModal),
  {
    ssr: false, // Usually good for modals that are client-side interactive
    // You can add a loading component if needed:
    // loading: () => <p>Loading media library...</p>,
  }
);

// This was previously in RichTextEditor.tsx, moved here as MenuBar uses it.
const fontSizes = [
  { value: 'text-xs', label: 'X-Small', name: 'XS' },
  { value: 'text-sm', label: 'Small', name: 'S' },
  { value: 'text-base', label: 'Base', name: 'M' },
  { value: 'text-lg', label: 'Large', name: 'L' },
  { value: 'text-xl', label: 'X-Large', name: 'XL' },
];

interface MenuBarProps {
  editor: Editor | null;
  toggleSourceView: () => void;
  isSourceView: boolean;
}

export const MenuBar = ({ editor, toggleSourceView, isSourceView }: MenuBarProps) => {
  if (!editor) {
    return null;
  }
  const iconSize = "h-4 w-4";
  const themeColors = [
    { value: 'primary', label: 'Primary', swatchClass: 'bg-primary text-primary-foreground' },
    { value: 'secondary', label: 'Secondary', swatchClass: 'bg-secondary text-secondary-foreground' },
    { value: 'accent', label: 'Accent', swatchClass: 'bg-accent text-accent-foreground' },
    { value: 'muted', label: 'Muted', swatchClass: 'bg-muted-foreground text-muted' },
    { value: 'destructive', label: 'Destructive', swatchClass: 'bg-destructive text-destructive-foreground' },
    { value: 'background', label: 'Background', swatchClass: 'bg-background text-foreground' },
  ];

  const activeColor = themeColors.find(color => editor.isActive('textStyle', { color: `hsl(var(--${color.value}))` }));
  const activeFontSize = fontSizes.find(size => editor.isActive('fontSize', { 'data-font-size': size.value }));

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-input bg-background rounded-t-md mb-0">
      <Button type="button" variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run() || !editor.isEditable || isSourceView} title="Bold">
        <Bold className={iconSize} />
      </Button>
      <Button type="button" variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run() || !editor.isEditable || isSourceView} title="Italic">
        <Italic className={iconSize} />
      </Button>
      <Button type="button" variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run() || !editor.isEditable || isSourceView} title="Strikethrough">
        <Strikethrough className={iconSize} />
      </Button>
      <Button type="button" variant={editor.isActive('code') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editor.can().chain().focus().toggleCode().run() || !editor.isEditable || isSourceView} title="Code">
        <Code className={iconSize} />
      </Button>
      <Button type="button" variant={editor.isActive('paragraph') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().setParagraph().run()} disabled={!editor.isEditable || isSourceView} title="Paragraph">
        <Pilcrow className={iconSize} />
      </Button>
      {[1, 2, 3, 4].map((level) => (
        <Button key={level} type="button" variant={editor.isActive('heading', { level }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run()} disabled={!editor.isEditable || isSourceView} title={`Heading ${level}`} className="font-semibold w-8 h-8">
          H{level}
        </Button>
      ))}
      <Button type="button" variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.isEditable || isSourceView} title="Bullet List">
        <List className={iconSize} />
      </Button>
      <Button type="button" variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!editor.isEditable || isSourceView} title="Ordered List">
        <ListOrdered className={iconSize} />
      </Button>
      <Button type="button" variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={!editor.isEditable || isSourceView} title="Blockquote">
        <Quote className={iconSize} />
      </Button>

      {/* Theme Color Dropdown Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!editor?.isEditable || isSourceView}
            title="Text Color"
            className="flex items-center justify-center"
          >
            <Palette className={iconSize} />
            {activeColor ? (
              <div className={`${activeColor.swatchClass.split(' ')[0]} w-3 h-3 rounded-sm ml-1 border border-border`}></div>
            ) : (
              <div className="w-3 h-3 rounded-sm ml-1 border border-border bg-transparent"></div> // Default/no color swatch
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {themeColors.map(color => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => editor.chain().focus().setColor(`hsl(var(--${color.value}))`).run()}
              className="flex items-center cursor-pointer"
            >
              <div className={`${color.swatchClass.split(' ')[0]} w-4 h-4 rounded-sm mr-2 border border-border`}></div>
              <span>{color.label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="flex items-center cursor-pointer"
          >
            <XIcon className={`${iconSize} mr-2`} />
            <span>Unset Color</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font Size Dropdown Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!editor?.isEditable || isSourceView}
            title="Font Size"
            className="flex items-center justify-center w-auto px-2" // Adjusted for text
          >
            <Baseline className={iconSize} />
            {activeFontSize ? (
              <span className="ml-1 text-xs font-semibold">{activeFontSize.name}</span>
            ) : (
              <span className="ml-1 text-xs font-semibold">M</span> // Default to M if no specific size is active
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {fontSizes.map(size => (
            <DropdownMenuItem
              key={size.value}
              onClick={() => editor.chain().focus().setFontSize(size.value).run()}
              className="flex items-center cursor-pointer"
            >
              <span className={`${size.value} mr-2`}>{size.label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => editor.chain().focus().unsetFontSize().run()}
            className="flex items-center cursor-pointer"
          >
            <XIcon className={`${iconSize} mr-2`} />
            <span>Reset Size</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setAlertWidget({ type: 'info', title: 'Info', message: 'New Alert', align: 'left', size: 'fit-content', textAlign: 'left' }).run()}
        disabled={!editor.can().setAlertWidget({ type: 'info', title: 'Info', message: 'New Alert', align: 'left', size: 'fit-content', textAlign: 'left' }) || !editor.isEditable || isSourceView}
        title="Insert Alert"
      >
        <AlertTriangle className={iconSize} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setCtaWidget({ text: 'Click Here', url: '#', style: 'primary', align: 'left', size: 'fit-content', textAlign: 'left' }).run()}
        disabled={!editor.can().setCtaWidget({ text: 'Click Here', url: '#', style: 'primary', align: 'left', size: 'fit-content', textAlign: 'left' }) || !editor.isEditable || isSourceView}
        title="Insert CTA"
      >
        <Link className={iconSize} />
      </Button>

      <MediaLibraryModal editor={editor} />

      <Button type="button" variant="ghost" size="icon" onClick={toggleSourceView} disabled={!editor.isEditable} title={isSourceView ? "Rich Text View" : "HTML Source View"}>
        <FileCode className={iconSize} />
      </Button>

      <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo() || !editor.isEditable || isSourceView} title="Undo">
        <Undo className={iconSize} />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo() || !editor.isEditable || isSourceView} title="Redo">
        <Redo className={iconSize} />
      </Button>
    </div>
  );
};