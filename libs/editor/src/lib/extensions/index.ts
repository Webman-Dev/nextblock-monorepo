// libs/editor/src/lib/extensions/index.ts
import { type Extension, type Node, type Mark } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Focus } from '@tiptap/extension-focus';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Typography } from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import AlertWidgetNode from './AlertWidgetNode';
import CtaWidgetNode from './CtaWidgetNode';
import { SlashCommand } from './SlashCommandComponent.js';

// Load syntax highlighting languages
import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

export const editorExtensions: Array<Extension<any,any> | Node<any,any> | Mark<any,any>> = [
  StarterKit.configure({
    codeBlock: false, // We'll add this with lowlight dynamically
    link: {
      openOnClick: false,
    },
    dropcursor: {
      color: '#60A5FA',
      width: 2,
    },
    bulletList: {
      HTMLAttributes: {
        class: 'list-disc pl-4',
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: 'list-decimal pl-4',
      },
    },
  }),
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
  Highlight.configure({
    multicolor: true,
  }),
  Subscript,
  Superscript,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TextStyle,
  Color,
  FontFamily,
  CharacterCount.configure({
    limit: 20000,
  }),
  Focus.configure({
    className: 'has-focus',
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading' && node.attrs.level === 1) {
        return 'What’s the title?';
      }
      if (node.type.name === 'paragraph' && node.content.size === 0) {
        return "Press '/' for commands...";
      }
      return '';
    },
    emptyEditorClass: 'is-editor-empty',
  }),
  Typography,
  TaskList.configure({
    HTMLAttributes: {
      class: 'list-none pl-0',
    },
  }),
  TaskItem.configure({
    nested: true, // Allow nested task lists
    HTMLAttributes: {
      class: 'flex items-start my-1',
    },
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'w-full border-collapse border border-gray-300 dark:border-gray-700',
    },
  }),
  TableRow,
  TableHeader.configure({
    HTMLAttributes: {
      class: 'bg-gray-100 dark:bg-gray-800 font-bold p-2 border border-gray-300 dark:border-gray-700',
    },
  }),
  TableCell.configure({
    HTMLAttributes: {
      class: 'p-2 border border-gray-300 dark:border-gray-700',
    },
  }),
  AlertWidgetNode,
  CtaWidgetNode,
  SlashCommand,
];

export const getAsyncExtensions = async () => {
  const { createLowlight, common } = await import('lowlight');
  const lowlight = createLowlight(common);

  lowlight.register('html', xml);
  lowlight.register('css', css);
  lowlight.register('js', js);
  lowlight.register('ts', ts);

  return [
    CodeBlockLowlight.configure({
      lowlight,
    }),
  ];
};