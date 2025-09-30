// libs/editor/src/lib/kit.ts
import type { Editor, Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import ImageExtended from './extensions/ImageExtended'
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
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Gapcursor from '@tiptap/extension-gapcursor'
import Underline from '@tiptap/extension-underline'
import History from '@tiptap/extension-history'
import DragHandle from '@tiptap/extension-drag-handle'
import NodeRange from '@tiptap/extension-node-range'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

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
import { AdvancedPlaceholder } from './extensions/AdvancedPlaceholder'
import AlertWidget from './extensions/AlertWidget'
import CtaWidgetNode from './extensions/CtaWidgetNode'
import { SlashCommand } from './extensions/slash-command'
import { DraggableNodes } from './extensions/DraggableNodes'
import { StyleTagNode } from './extensions/StyleTagNode'
import { DivNode } from './extensions/DivNode'
import { PreserveAllAttributesExtension } from './extensions/PreserveAllAttributesExtension'
import { ScriptTagNode } from './extensions/ScriptTagNode'

let dragHandleElement: HTMLDivElement | null = null
let dragHandlePlusButton: HTMLButtonElement | null = null

// bring lowlight into scope with more languages
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

  // Allow safe representation of custom HTML/CSS/JS blocks
  DivNode,
  StyleTagNode,
  ScriptTagNode,
  PreserveAllAttributesExtension,

  ImageExtended.configure({
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

  AdvancedPlaceholder,

  // Collaboration and UX
  CharacterCount.configure({
    limit: 50000,
    mode: 'textSize',
  }),
  
  // Note: EnhancedFocus and KeyboardShortcuts extensions remain disabled because they caused cursor positioning glitches.
  // Revisit once upstream fixes land.

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
      dragHandleElement = element
      element.classList.add('tiptap-drag-handle')
      element.dataset.active = 'false'
      element.style.visibility = 'hidden'
      element.style.pointerEvents = 'none'

      const plusButton = document.createElement('button')
      dragHandlePlusButton = plusButton
      plusButton.type = 'button'
      plusButton.className = 'tiptap-drag-handle__button tiptap-drag-handle__plus'
      plusButton.setAttribute('aria-label', 'Insert block')
      plusButton.setAttribute('aria-expanded', 'false')
      plusButton.draggable = false
      plusButton.textContent = '+'
      plusButton.dataset.tooltip = 'Insert block'

      const grip = document.createElement('span')
      grip.className = 'tiptap-drag-handle__button tiptap-drag-handle__grip'
      grip.innerHTML = `
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="3" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="3" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="3" cy="15" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="15" r="1.5" fill="currentColor"/>
        </svg>
      `

      grip.setAttribute('aria-hidden', 'true')

      element.dataset.tooltip = 'Click for options\nHold for drag'
      element.appendChild(plusButton)
      element.appendChild(grip)

      const showHint = () => element.classList.add('tiptap-drag-handle--hint')
      const hideHint = () => element.classList.remove('tiptap-drag-handle--hint')

      grip.addEventListener('mouseenter', showHint)
      grip.addEventListener('mouseleave', hideHint)
      element.addEventListener('mouseleave', hideHint)

      plusButton.addEventListener('mousedown', event => {
        event.preventDefault()
        event.stopPropagation()
      })

      plusButton.addEventListener('dragstart', event => {
        event.preventDefault()
        event.stopPropagation()
      })

      plusButton.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          plusButton.click()
        }
      })

      plusButton.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        element.classList.remove('tiptap-drag-handle--hint')

        const toggleEvent = new CustomEvent('tiptap-gutter-toggle', {
          bubbles: true,
          detail: {
            handle: element,
            button: plusButton,
          },
        })

        element.dispatchEvent(toggleEvent)
      })

      return element
    },
    onNodeChange: ({ editor, node }: { editor: Editor; node: ProseMirrorNode | null }) => {
      if (!dragHandleElement) {
        return
      }

      const isDocNode = node?.type.name === 'doc'
      const shouldShow = Boolean(node) && !isDocNode && editor.isFocused && editor.isEditable

      if (shouldShow) {
        dragHandleElement.dataset.active = 'true'
        dragHandleElement.style.visibility = ''
        dragHandleElement.style.pointerEvents = 'auto'
      } else {
        dragHandleElement.dataset.active = 'false'
        dragHandleElement.classList.remove('tiptap-drag-handle--hint')
        dragHandleElement.removeAttribute('data-menu-open')
        dragHandleElement.style.visibility = 'hidden'
        dragHandleElement.style.pointerEvents = 'none'

        dragHandlePlusButton?.setAttribute('aria-expanded', 'false')
      }
    },
  }),
]

