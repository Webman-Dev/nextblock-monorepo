// libs/editor/src/lib/extensions/index.ts
import { type Extension, type Node, type Mark } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Blockquote from '@tiptap/extension-blockquote';
import { Color } from '@tiptap/extension-color';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import AlertWidgetNode from './AlertWidgetNode';
import CtaWidgetNode from './CtaWidgetNode';

// Load syntax highlighting languages
import { createLowlight, common } from 'lowlight';
import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

const lowlight = createLowlight(common);

lowlight.register('html', xml);
lowlight.register('css', css);
lowlight.register('js', js);
lowlight.register('ts', ts);

export const editorExtensions: Array<Extension<any,any> | Node<any,any> | Mark<any,any>> = [
  StarterKit.configure({
    codeBlock: false,
  }),
  Blockquote,
  CodeBlockLowlight.configure({
    lowlight,
  }),
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
  Link.configure({
    openOnClick: false,
  }),
  HorizontalRule,
  Color,
  ListItem,
  BulletList.configure({
    HTMLAttributes: {
      class: 'list-disc pl-4',
    },
  }),
  OrderedList.configure({
    HTMLAttributes: {
      class: 'list-decimal pl-4',
    },
  }),
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
];