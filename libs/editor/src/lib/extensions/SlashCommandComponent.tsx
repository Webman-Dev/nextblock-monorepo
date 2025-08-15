// libs/editor/src/lib/extensions/slash-command.ts
import { Editor, Extension, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, TextQuote, Code, ImageIcon, Table2, Minus } from 'lucide-react';
import { SlashCommandList, CommandListRef } from '../components/menus/SlashCommandList';
import React from 'react';

export interface CommandItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

const commandItems: CommandItemProps[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading.',
    icon: <Heading1 className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: <Heading2 className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: <Heading3 className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list.',
    icon: <List className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering.',
    icon: <ListOrdered className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Blockquote',
    description: 'Capture a quote.',
    icon: <TextQuote className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Capture a code snippet.',
    icon: <Code className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Image',
    description: 'Upload an image.',
    icon: <ImageIcon className="w-7 h-7" />,
    command: ({ editor, range }) => {
      // A real implementation would open a file picker
      const url = window.prompt('URL');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: 'Table',
    description: 'Insert a table.',
    icon: <Table2 className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: 'Horizontal Rule',
    description: 'Insert a horizontal divider.',
    icon: <Minus className="w-7 h-7" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  // {
  //   title: 'Alert',
  //   description: 'Add a prominent alert box.',
  //   icon: <AlertTriangle className="w-7 h-7" />,
  //   command: ({ editor, range }) => {
  //     editor.chain().focus().deleteRange(range).setAlertWidget({ type: 'info', title: 'Info', message: 'This is an alert.', align: 'center', size: 'medium', textAlign: 'left' }).run();
  //   },
  // },
  // {
  //   title: 'Call-to-Action',
  //   description: 'Add a CTA button.',
  //   icon: <Megaphone className="w-7 h-7" />,
  //   command: ({ editor, range }) => {
  //     editor.chain().focus().deleteRange(range).setCtaWidget({ text: 'Click me', url: '#', style: 'filled', align: 'center', size: 'medium', textAlign: 'center' }).run();
  //   },
  // },
];

export const SlashCommand = Extension.create({
  name: 'slash-command',
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        items: ({ query }) => {
          return commandItems.filter(item =>
            item.title.toLowerCase().startsWith(query.toLowerCase())
          ).slice(0, 10);
        },
        render: () => {
          let component: ReactRenderer<CommandListRef>;

          return {
            onStart: props => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });
            },
            onUpdate(props) {
              component.updateProps(props);
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                return true;
              }
              return component.ref?.onKeyDown({ event: props.event as any }) ?? false;
            },
            onExit() {
              component.destroy();
            },
          };
        },
      } as SuggestionOptions),
    ];
  },
});