// libs/editor/src/lib/components/menus/FloatingMenu.tsx
'use client';

import { Editor } from '@tiptap/react';
import {
  Heading1, Heading2, List, ListOrdered, TextQuote, Code, ImageIcon, Table2, Minus
} from 'lucide-react';
import { FC } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@nextblock-monorepo/ui/popover';
import { Button } from '@nextblock-monorepo/ui/button';

interface FloatingMenuComponentProps {
  editor: Editor;
}

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  command: () => boolean;
}

export const EditorFloatingMenu: FC<FloatingMenuComponentProps> = ({ editor }) => {
  const menuItems: MenuItem[] = [
    {
      title: 'Heading 1',
      icon: <Heading1 className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: 'Heading 2',
      icon: <Heading2 className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Bulleted List',
      icon: <List className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Numbered List',
      icon: <ListOrdered className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: 'Quote',
      icon: <TextQuote className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Code Block',
      icon: <Code className="h-4 w-4" />,
      command: () => editor.chain().focus().setCodeBlock().run(),
    },
    {
      title: 'Image',
      icon: <ImageIcon className="h-4 w-4" />,
      command: () => {
        const url = window.prompt('Image URL');
        if (url) {
          return editor.chain().focus().setImage({ src: url }).run();
        }
        return false;
      },
    },
    {
      title: 'Table',
      icon: <Table2 className="h-4 w-4" />,
      command: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: 'Divider',
      icon: <Minus className="h-4 w-4" />,
      command: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  const runCommand = (command: () => boolean) => {
    command();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
          +
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <div className="flex flex-col">
          {menuItems.map((item) => (
            <Button
              key={item.title}
              variant="ghost"
              className="justify-start"
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