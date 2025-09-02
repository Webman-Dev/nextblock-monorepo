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
import { TextStyleKit } from '@tiptap/extension-text-style'
import CharacterCount from '@tiptap/extension-character-count'
import Focus from '@tiptap/extension-focus'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Gapcursor from '@tiptap/extension-gapcursor'
import Underline from '@tiptap/extension-underline'
import History from '@tiptap/extension-history'
import DragHandle from '@tiptap/extension-drag-handle'
import NodeRange from '@tiptap/extension-node-range'

import { createLowlight } from 'lowlight'
import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'

// custom extensions
import { TrailingNode } from './extensions/TrailingNode'
import AlertWidget from './extensions/AlertWidget'
import CtaWidgetNode from './extensions/CtaWidgetNode'
import { SlashCommand } from './extensions/slash-command'
import { DraggableNodes } from './extensions/DraggableNodes'
import { AdvancedPlaceholder } from './extensions/AdvancedPlaceholder'
import { EnhancedFocus } from './extensions/EnhancedFocus'
import { KeyboardShortcuts } from './extensions/KeyboardShortcuts'

// ✅ bring lowlight into scope with more languages
const lowlight = createLowlight({ html, css, js, ts, python, json, bash, sql })


export const editorExtensions: Extensions = [
  StarterKit.configure({
    codeBlock: false,               // we'll use CodeBlockLowlight
    link: false,                    // we'll use enhanced Link extension
    // CRITICAL FIX: Disable built-in undo/redo - we'll use a separate History extension for better control
    undoRedo: false,                // Updated for Tiptap v3 (was 'history' in v2)
    bulletList: {
      HTMLAttributes: { class: 'list-disc pl-4' },
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      HTMLAttributes: { class: 'list-decimal pl-4' },
      keepMarks: true,
      keepAttributes: false,
    },
    dropcursor: { color: '#60A5FA', width: 2 },
    gapcursor: false,               // we'll use enhanced Gapcursor
  }),

  // Enhanced extensions
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: 'https',
    protocols: ['http', 'https', 'ftp', 'mailto'],
    validate: (url) => /^https?:\/\//.test(url),
    HTMLAttributes: {
      class: 'text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
  }),

  Gapcursor,
  Underline,

  // CRITICAL FIX: Add History extension to replace disabled StarterKit history
  History.configure({
    depth: 100,
    newGroupDelay: 500,
  }),

  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
    HTMLAttributes: {
      class: 'relative rounded-md bg-muted p-4 font-mono text-sm',
    },
  }),

  Image.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      class: 'max-w-full h-auto rounded-md',
    },
  }),

  // Enhanced task lists
  TaskList.configure({
    HTMLAttributes: { class: 'list-none pl-0 space-y-1' },
  }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: { class: 'flex items-start gap-2 my-1' },
  }),

  // Enhanced tables
  Table.configure({
    resizable: true,
    cellMinWidth: 100,
    HTMLAttributes: {
      class: 'w-full border-collapse border border-gray-300 dark:border-gray-700 my-4',
    },
  }),
  TableRow.configure({
    HTMLAttributes: {
      class: 'border-b border-gray-300 dark:border-gray-700',
    },
  }),
  TableHeader.configure({
    HTMLAttributes: {
      class: 'bg-gray-100 dark:bg-gray-800 font-bold p-3 text-left border border-gray-300 dark:border-gray-700',
    },
  }),
  TableCell.configure({
    HTMLAttributes: {
      class: 'p-3 border border-gray-300 dark:border-gray-700 min-w-[100px]',
    },
  }),

  // Typography and formatting - Using TextStyleKit for comprehensive text styling
  TextStyleKit.configure({
    // Configure individual extensions within the kit
    color: {
      types: ['textStyle'],
    },
    fontFamily: {
      types: ['textStyle'],
    },
    fontSize: {
      types: ['textStyle'],
    },
    // backgroundColor can be disabled if not needed
    // backgroundColor: false,
  }),

  Highlight.configure({
    multicolor: true,
    HTMLAttributes: {
      class: 'rounded-sm px-1 py-0.5',
    },
  }),
  Subscript,
  Superscript,
  TextAlign.configure({
    types: ['heading', 'paragraph', 'div'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'left',
  }),
  Typography,

  // Collaboration and UX
  CharacterCount.configure({
    limit: 50000,
    mode: 'textSize',
  }),
  
  // Note: EnhancedFocus, AdvancedPlaceholder, and KeyboardShortcuts extensions
  // have been disabled as they were causing text cutting bugs during cursor positioning

  // Custom extensions
  TrailingNode,
  AlertWidget,
  CtaWidgetNode,
  SlashCommand,

  // Drag and Drop extensions
  DraggableNodes,
  NodeRange,
  DragHandle.configure({
    render: () => {
      const element = document.createElement('div')
      element.classList.add('tiptap-drag-handle')
      
      // Create the drag handle icon
      element.innerHTML = `
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="3" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="3" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="3" cy="15" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="15" r="1.5" fill="currentColor"/>
        </svg>
      `
      
      return element
    },
  }),
]
