// libs/editor/src/lib/kit.ts
import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import CharacterCount from '@tiptap/extension-character-count'
import Focus from '@tiptap/extension-focus'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'

import { createLowlight } from 'lowlight'
import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'

// custom extensions
import { TrailingNode } from './extensions/TrailingNode'
import AlertWidget from './extensions/AlertWidget'
import CtaWidgetNode from './extensions/CtaWidgetNode'
import { SlashCommand } from './extensions/slash-command'

// ✅ bring lowlight into scope
const lowlight = createLowlight({ html, css, js, ts })

export const editorExtensions: Extensions = [
  StarterKit.configure({
    codeBlock: false,               // we'll use CodeBlockLowlight
    link: { openOnClick: false },   // configure built-in Link here
    bulletList: { HTMLAttributes: { class: 'list-disc pl-4' } },
    orderedList: { HTMLAttributes: { class: 'list-decimal pl-4' } },
    dropcursor: { color: '#60A5FA', width: 2 },
    trailingNode: false,            // disable built-in if you keep your custom one
  }),

  CodeBlockLowlight.configure({ lowlight }),

  Image.configure({ inline: true, allowBase64: true }),

  // task list isn’t in StarterKit
  TaskList.configure({ HTMLAttributes: { class: 'list-none pl-0' } }),
  TaskItem.configure({ nested: true, HTMLAttributes: { class: 'flex items-start my-1' } }),

  // tables
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
    HTMLAttributes: { class: 'p-2 border border-gray-300 dark:border-gray-700' },
  }),

  // formatting / UI
  Highlight.configure({ multicolor: true }),
  Subscript,
  Superscript,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Color,
  FontFamily,
  Typography,
  CharacterCount.configure({ limit: 20000 }),
  Focus.configure({ className: 'has-focus' }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading' && node.attrs.level === 1) return 'What’s the title?'
      if (node.type.name === 'paragraph' && node.content.size === 0) return "Press '/' for commands..."
      return ''
    },
  }),

  // keep your custom trailing node only if you disabled StarterKit’s above
  TrailingNode,

  // custom bits
  AlertWidget,
  CtaWidgetNode,
  SlashCommand,
]
