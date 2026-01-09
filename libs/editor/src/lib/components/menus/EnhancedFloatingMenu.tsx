'use client';
import { getOpenImagePicker } from "../../utils/mediaPicker";

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, TextQuote, Code,
  Image as ImageIcon, Table2, Minus, PlusCircle, Type, CheckSquare,
  Video, AlertTriangle, Megaphone, Hash, Terminal
} from 'lucide-react';
import { Button } from '@nextblock-cms/ui/button';
import { useFloating, offset, flip, shift, autoUpdate, size } from '@floating-ui/react';

interface EnhancedFloatingMenuProps {
  editor: Editor;
  wrapperRef?: React.RefObject<HTMLDivElement | null>;
}

type MenuCategory = 'basic' | 'headings' | 'lists' | 'media' | 'advanced';

type MenuItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
  category: MenuCategory;
  keywords: string[];
};

const menuItems: MenuItem[] = [
  // Basic text
  {
    title: 'Text',
    description: 'Start writing with plain text',
    icon: <Type className="h-4 w-4" />,
    command: (e) => e.chain().focus().clearNodes().run(),
    category: 'basic',
    keywords: ['text', 'paragraph', 'plain']
  },
  
  // Headings
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="h-4 w-4" />,
    command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    category: 'headings',
    keywords: ['heading', 'h1', 'title', 'large']
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="h-4 w-4" />,
    command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    category: 'headings',
    keywords: ['heading', 'h2', 'subtitle', 'medium']
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="h-4 w-4" />,
    command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    category: 'headings',
    keywords: ['heading', 'h3', 'small']
  },

  // Lists
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list',
    icon: <List className="h-4 w-4" />,
    command: (e) => e.chain().focus().toggleBulletList().run(),
    category: 'lists',
    keywords: ['bullet', 'list', 'unordered', 'ul']
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering',
    icon: <ListOrdered className="h-4 w-4" />,
    command: (e) => e.chain().focus().toggleOrderedList().run(),
    category: 'lists',
    keywords: ['numbered', 'list', 'ordered', 'ol']
  },
  {
    title: 'Task List',
    description: 'Create a list with checkboxes',
    icon: <CheckSquare className="h-4 w-4" />,
    command: (e) => e.chain().focus().toggleTaskList().run(),
    category: 'lists',
    keywords: ['task', 'todo', 'checkbox', 'checklist']
  },

  // Media
  {
    title: 'Image',
    description: 'Insert an image',
    icon: <ImageIcon className="h-4 w-4" />,
    command: async (e) => {
      const opener = getOpenImagePicker(e);
      if (opener) {
        const res = await opener();
        if (res?.src) e.chain().focus().setImage({ src: res.src, alt: res.alt || undefined }).updateAttributes('image', { blurDataURL: res.blurDataURL || undefined }).run();
        return;
      }
      const url = window.prompt('Enter image URL:');
      if (url) e.chain().focus().setImage({ src: url }).run();
    },
    category: 'media',
    keywords: ['image', 'picture', 'photo', 'img']
  },
  {
    title: 'Video',
    description: 'Embed a video from URL',
    icon: <Video className="h-4 w-4" />,
    command: (e) => {
      const url = window.prompt('Enter video URL (YouTube, Vimeo, etc.):');
      if (url) {
        e.chain().focus().insertContent(`<p><a href="${url}" target="_blank">Video: ${url}</a></p>`).run();
      }
    },
    category: 'media',
    keywords: ['video', 'youtube', 'vimeo', 'embed']
  },

  // Advanced
  {
    title: 'Blockquote',
    description: 'Create a quote or citation',
    icon: <TextQuote className="h-4 w-4" />,
    command: (e) => e.chain().focus().toggleBlockquote().run(),
    category: 'advanced',
    keywords: ['quote', 'blockquote', 'citation']
  },
  {
    title: 'Code Block',
    description: 'Create a code block with syntax highlighting',
    icon: <Code className="h-4 w-4" />,
    command: (e) => e.chain().focus().toggleCodeBlock().run(),
    category: 'advanced',
    keywords: ['code', 'programming', 'syntax', 'block']
  },
  {
    title: 'Table',
    description: 'Insert a table with rows and columns',
    icon: <Table2 className="h-4 w-4" />,
    command: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    category: 'advanced',
    keywords: ['table', 'grid', 'rows', 'columns']
  },
  {
    title: 'Horizontal Rule',
    description: 'Insert a horizontal divider',
    icon: <Minus className="h-4 w-4" />,
    command: (e) => e.chain().focus().setHorizontalRule().run(),
    category: 'advanced',
    keywords: ['divider', 'separator', 'line', 'hr']
  },
  {
    title: 'Alert',
    description: 'Insert an alert or notice',
    icon: <AlertTriangle className="h-4 w-4" />,
    command: (e) => {
      if (e.can().setAlertWidget()) {
        e.chain().focus().setAlertWidget().run();
      } else {
        e.chain().focus().toggleBlockquote().run();
      }
    },
    category: 'advanced',
    keywords: ['alert', 'notice', 'warning', 'info']
  },
  {
    title: 'Call to Action',
    description: 'Insert a call to action button',
    icon: <Megaphone className="h-4 w-4" />,
    command: (e) => {
      if (e.can().setCtaWidget()) {
        e.chain().focus().setCtaWidget({
          text: 'Click me',
          url: '#',
          style: 'primary',
          size: 'medium',
          textAlign: 'center',
        }).run();
      } else {
        e.chain().focus().insertContent('Call to Action').run();
      }
    },
    category: 'advanced',
    keywords: ['cta', 'button', 'action', 'link']
  }
];

const categoryIcons: Record<MenuCategory, React.ReactNode> = {
  basic: <Type className="h-3 w-3" />,
  headings: <Hash className="h-3 w-3" />,
  lists: <List className="h-3 w-3" />,
  media: <ImageIcon className="h-3 w-3" />,
  advanced: <Terminal className="h-3 w-3" />
};

const categoryLabels: Record<MenuCategory, string> = {
  basic: 'Basic',
  headings: 'Headings',
  lists: 'Lists',
  media: 'Media',
  advanced: 'Advanced'
};

export const EnhancedFloatingMenu: FC<EnhancedFloatingMenuProps> = ({ editor, wrapperRef }) => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'all'>('all');
  const [triggerStyle, setTriggerStyle] = useState<{ top: number; left: number; width: number }>({
    top: -9999,
    left: -9999,
    width: 0,
  });

  const { x, y, refs, strategy, update } = useFloating({
    placement: 'bottom-start',
    open,
    onOpenChange: setOpen,
    middleware: [
      offset(10),
      flip({ fallbackPlacements: ['top-start', 'bottom-start', 'right-start'] }),
      shift({ padding: 8 }),
      size({
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.min(400, availableWidth - 16)}px`,
            maxHeight: `${Math.min(500, availableHeight - 16)}px`,
          });
        },
      })
    ],
    whileElementsMounted: autoUpdate,
  });

  // Enhanced predicate for visibility (empty paragraph, heading, or list item)
  const shouldShowTrigger = useCallback(() => {
    const { $from } = editor.state.selection;
    const parent = $from.parent;
    
    // Show on empty paragraphs
    if (parent.type.name === 'paragraph' && parent.content.size === 0) {
      return true;
    }
    
    // Show on empty headings
    if (parent.type.name === 'heading' && parent.content.size === 0) {
      return true;
    }
    
    // Show on empty list items
    if (parent.type.name === 'listItem' && parent.content.size === 1) {
      const firstChild = parent.firstChild;
      if (firstChild && firstChild.type.name === 'paragraph' && firstChild.content.size === 0) {
        return true;
      }
    }
    
    return editor.isEditable;
  }, [editor]);

  // Enhanced positioning function
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
    setSearchQuery('');
    setSelectedCategory('all');
  };

  // Filter items based on search and category
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Group items by category for display
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<MenuCategory, MenuItem[]>);

  if (!visible) return null;

  return (
    <>
      {/* Enhanced Trigger */}
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
          {/* Enhanced Horizontal Line with gradient */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600 transform origin-center scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100 transition-all duration-300" />
          
          {/* Enhanced Plus Icon with better animations */}
          <div
            ref={refs.setReference}
            className="relative z-10 cursor-pointer mx-auto"
            onClick={() => setOpen((v) => !v)}
          >
            {/* Animated Circle with pulse effect */}
            <div className="absolute -inset-3 rounded-full bg-primary/10 dark:bg-primary/20 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-out animate-pulse" />
            
            {/* Plus Icon Container with better styling */}
            <div className="relative bg-background border border-border p-1.5 rounded-full shadow-sm group-hover:shadow-md transition-all duration-200">
              <PlusCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Menu */}
      {open && (
        <div
          ref={refs.setFloating}
          style={{ position: strategy, top: y ?? 0, left: x ?? 0, zIndex: 10001 }}
          className="bg-background border border-border shadow-lg rounded-lg p-2 w-96 max-h-[500px] overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="text-xs whitespace-nowrap"
            >
              All
            </Button>
            {Object.entries(categoryLabels).map(([category, label]) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(category as MenuCategory)}
                className="text-xs whitespace-nowrap flex items-center gap-1"
              >
                {categoryIcons[category as MenuCategory]}
                {label}
              </Button>
            ))}
          </div>

          {/* Items List */}
          <div className="max-h-80 overflow-y-auto">
            {selectedCategory === 'all' ? (
              // Show grouped by category
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="py-2">
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    {categoryIcons[category as MenuCategory]}
                    {categoryLabels[category as MenuCategory]}
                  </div>
                  {items.map((item) => (
                    <Button
                      key={item.title}
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto text-left"
                      onClick={() => runCommand(item.command)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ))
            ) : (
              // Show flat list for specific category
              filteredItems.map((item) => (
                <Button
                  key={item.title}
                  variant="ghost"
                  className="w-full justify-start p-3 h-auto text-left"
                  onClick={() => runCommand(item.command)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                  </div>
                </Button>
              ))
            )}
            
            {filteredItems.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No blocks found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};





