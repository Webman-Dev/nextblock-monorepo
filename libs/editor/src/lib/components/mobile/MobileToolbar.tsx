'use client';
import { getOpenImagePicker } from "../../utils/mediaPicker";

import React, { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Bold, Italic, Underline, List, ListOrdered, CheckSquare,
  Heading1, Heading2, Heading3, TextQuote, Code, Link2,
  Image, Table2, Palette, Type, AlignLeft, AlignCenter,
  AlignRight, X, Menu
} from 'lucide-react';
import { Button } from '@nextblock-cms/ui/button';
import { cn } from '@nextblock-cms/utils';

interface MobileToolbarProps {
  editor: Editor;
  className?: string;
}

type ToolbarSection = 'format' | 'blocks' | 'insert' | 'align';

interface ToolbarItem {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: () => boolean;
  section: ToolbarSection;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({ editor, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<ToolbarSection>('format');
  const [isExpanded, setIsExpanded] = useState(false);

  // Detect mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsVisible(isMobile());
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show/hide toolbar based on selection
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { selection } = editor.state;
      const hasSelection = !selection.empty;
      
      if (hasSelection && isMobile()) {
        setIsVisible(true);
      } else if (!isExpanded) {
        setIsVisible(false);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('focus', handleSelectionUpdate);
    editor.on('blur', () => {
      if (!isExpanded) {
        setIsVisible(false);
      }
    });

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('focus', handleSelectionUpdate);
      editor.off('blur', () => setIsVisible(false));
    };
  }, [editor, isExpanded]);

  const toolbarItems: ToolbarItem[] = [
    // Format section
    {
      icon: <Bold className="h-4 w-4" />,
      label: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
      section: 'format'
    },
    {
      icon: <Italic className="h-4 w-4" />,
      label: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
      section: 'format'
    },
    {
      icon: <Underline className="h-4 w-4" />,
      label: 'Underline',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive('underline'),
      section: 'format'
    },
    {
      icon: <Code className="h-4 w-4" />,
      label: 'Code',
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
      section: 'format'
    },
    {
      icon: <Palette className="h-4 w-4" />,
      label: 'Highlight',
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: () => editor.isActive('highlight'),
      section: 'format'
    },

    // Blocks section
    {
      icon: <Type className="h-4 w-4" />,
      label: 'Paragraph',
      action: () => editor.chain().focus().setParagraph().run(),
      isActive: () => editor.isActive('paragraph'),
      section: 'blocks'
    },
    {
      icon: <Heading1 className="h-4 w-4" />,
      label: 'Heading 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
      section: 'blocks'
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      label: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
      section: 'blocks'
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      label: 'Heading 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
      section: 'blocks'
    },
    {
      icon: <List className="h-4 w-4" />,
      label: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
      section: 'blocks'
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      label: 'Numbered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
      section: 'blocks'
    },
    {
      icon: <CheckSquare className="h-4 w-4" />,
      label: 'Task List',
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskList'),
      section: 'blocks'
    },
    {
      icon: <TextQuote className="h-4 w-4" />,
      label: 'Quote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
      section: 'blocks'
    },

    // Insert section
    {
      icon: <Link2 className="h-4 w-4" />,
      label: 'Link',
      action: () => {
        const url = window.prompt('Enter URL:');
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      },
      isActive: () => editor.isActive('link'),
      section: 'insert'
    },
    {
      icon: <Image className="h-4 w-4" />,
      label: 'Image',
      action: async () => {
        const opener = getOpenImagePicker(editor);
        if (opener) {
          const res = await opener();
          if (res?.src) editor.chain().focus().setImage({ src: res.src, alt: res.alt || undefined }).run();
          return;
        }
        const url = window.prompt('Enter image URL:');
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      },
      section: 'insert'
    },
    {
      icon: <Table2 className="h-4 w-4" />,
      label: 'Table',
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      section: 'insert'
    },

    // Align section
    {
      icon: <AlignLeft className="h-4 w-4" />,
      label: 'Align Left',
      action: () => editor.chain().focus().setTextAlign('left').run(),
      isActive: () => editor.isActive({ textAlign: 'left' }),
      section: 'align'
    },
    {
      icon: <AlignCenter className="h-4 w-4" />,
      label: 'Align Center',
      action: () => editor.chain().focus().setTextAlign('center').run(),
      isActive: () => editor.isActive({ textAlign: 'center' }),
      section: 'align'
    },
    {
      icon: <AlignRight className="h-4 w-4" />,
      label: 'Align Right',
      action: () => editor.chain().focus().setTextAlign('right').run(),
      isActive: () => editor.isActive({ textAlign: 'right' }),
      section: 'align'
    },
  ];

  const sections = [
    { key: 'format' as const, label: 'Format', icon: <Bold className="h-3 w-3" /> },
    { key: 'blocks' as const, label: 'Blocks', icon: <Heading1 className="h-3 w-3" /> },
    { key: 'insert' as const, label: 'Insert', icon: <Image className="h-3 w-3" /> },
    { key: 'align' as const, label: 'Align', icon: <AlignLeft className="h-3 w-3" /> },
  ];

  const currentItems = toolbarItems.filter(item => item.section === activeSection);

  if (!isVisible && !isExpanded) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg',
        'transform transition-transform duration-300 ease-in-out',
        isVisible || isExpanded ? 'translate-y-0' : 'translate-y-full',
        className
      )}
    >
      {/* Toggle Button */}
      <div className="flex justify-center py-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          {isExpanded ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span className="text-xs">{isExpanded ? 'Close' : 'Tools'}</span>
        </Button>
      </div>

      {(isExpanded || isVisible) && (
        <>
          {/* Section Tabs */}
          <div className="flex border-b border-border bg-muted/50">
            {sections.map((section) => (
              <Button
                key={section.key}
                variant={activeSection === section.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveSection(section.key)}
                className="flex-1 rounded-none text-xs py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  {section.icon}
                  <span>{section.label}</span>
                </div>
              </Button>
            ))}
          </div>

          {/* Toolbar Items */}
          <div className="p-2">
            <div className="flex flex-wrap gap-1 justify-center">
              {currentItems.map((item, index) => (
                <Button
                  key={index}
                  variant={item.isActive?.() ? 'default' : 'ghost'}
                  size="sm"
                  onClick={item.action}
                  className="flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-[60px]"
                  title={item.label}
                >
                  {item.icon}
                  <span className="text-xs">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Safe area for devices with home indicator */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
};







