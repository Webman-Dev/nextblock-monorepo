// libs/editor/src/lib/kit.ts
import type { Extensions } from '@tiptap/core'
import { offset } from '@floating-ui/dom'
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
import { SvgNode } from './extensions/SvgNode'
import { SpanNode } from './extensions/SpanNode'

// bring lowlight into scope with more languages
const lowlight = createLowlight({ html, css, js, ts, python, json, bash, sql })

const SVG_NS = 'http://www.w3.org/2000/svg'

function createFilledIcon(pathData: string[]) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'currentColor')
  svg.classList.add('tiptap-drag-handle__icon', 'tiptap-drag-handle__icon--filled')

  pathData.forEach(d => {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  })

  return svg
}

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
  SvgNode,
  SpanNode,
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
  TextAlign.extend({
    addGlobalAttributes() {
      return [
        {
          types: this.options.types,
          attributes: {
            textAlign: {
              default: this.options.defaultAlignment,
              parseHTML: (element: HTMLElement) => {
                // 1. Inline style (highest priority)
                if (element.style.textAlign) {
                  return element.style.textAlign
                }
                // 2. Deprecated 'align' attribute
                if (element.getAttribute('align')) {
                  return element.getAttribute('align')
                }
                // 3. Tailwind classes parsing
                const className = element.getAttribute('class') || ''
                if (/(?:^|\s)text-center(?:\s|$)/.test(className)) return 'center'
                if (/(?:^|\s)text-right(?:\s|$)/.test(className)) return 'right'
                if (/(?:^|\s)text-justify(?:\s|$)/.test(className)) return 'justify'
                if (/(?:^|\s)text-left(?:\s|$)/.test(className)) return 'left'
                
                return null
              },
              renderHTML: (attributes: Record<string, any>) => {
                if (attributes.textAlign === this.options.defaultAlignment) {
                  return {}
                }
                return { style: `text-align: ${attributes.textAlign} !important` }
              },
            },
          },
        },
      ]
    },
  }).configure({
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
    computePositionConfig: {
      placement: 'left-start',
      strategy: 'absolute',
      middleware: [offset({ mainAxis: 5, crossAxis: 0 })],
    },
    onElementDragStart: () => {
      if (typeof document !== 'undefined') {
        document.body.classList.add('dragging')
      }
    },
    onElementDragEnd: () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('dragging')
      }
    },
    onNodeChange: ({ editor }) => {
      // no-op, but keep hook defined to satisfy eslint and future custom behaviour
      void editor
    },
    render() {
      const handle = document.createElement('div')
      handle.classList.add('drag-handle', 'tiptap-drag-handle')

      if (typeof window !== 'undefined') {
        ;(window as any).__dragHandleElement = handle
      }

      const group = document.createElement('div')
      group.classList.add('tiptap-drag-handle__group')
      group.setAttribute('role', 'group')
      group.dataset.orientation = 'horizontal'
      handle.appendChild(group)

      const plusButton = document.createElement('button')
      plusButton.type = 'button'
      plusButton.classList.add(
        'tiptap-drag-handle__button',
        'tiptap-drag-handle__button--ghost',
        'tiptap-drag-handle__plus',
      )
      plusButton.setAttribute('aria-label', 'Insert block')
      plusButton.setAttribute('title', 'Insert block')

      const plusIcon = createFilledIcon([
        'M13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5Z',
      ])
      plusButton.appendChild(plusIcon)
      group.appendChild(plusButton)

      const grip = document.createElement('button')
      grip.type = 'button'
      grip.classList.add(
        'tiptap-drag-handle__button',
        'tiptap-drag-handle__button--ghost',
        'tiptap-drag-handle__grip',
      )
      grip.setAttribute('aria-label', 'Drag to reorder')
      grip.setAttribute('title', 'Drag to reorder')
      grip.setAttribute('tabindex', '0')
      grip.setAttribute('aria-haspopup', 'menu')
      grip.setAttribute('aria-expanded', 'false')

      const gripIcon = createFilledIcon([
        'M9 3C7.89543 3 7 3.89543 7 5C7 6.10457 7.89543 7 9 7C10.1046 7 11 6.10457 11 5C11 3.89543 10.1046 3 9 3Z',
        'M9 10C7.89543 10 7 10.8954 7 12C7 13.1046 7.89543 14 9 14C10.1046 14 11 13.1046 11 12C11 10.8954 10.1046 10 9 10Z',
        'M7 19C7 17.8954 7.89543 17 9 17C10.1046 17 11 17.8954 11 19C11 20.1046 10.1046 21 9 21C7.89543 21 7 20.1046 7 19Z',
        'M15 10C13.8954 10 13 10.8954 13 12C13 13.1046 13.8954 14 15 14C16.1046 14 17 13.1046 17 12C17 10.8954 16.1046 10 15 10Z',
        'M13 5C13 3.89543 13.8954 3 15 3C16.1046 3 17 3.89543 17 5C17 6.10457 16.1046 7 15 7C13.8954 7 13 6.10457 13 5Z',
        'M15 17C13.8954 17 13 17.8954 13 19C13 20.1046 13.8954 21 15 21C16.1046 21 17 20.1046 17 19C17 17.8954 16.1046 17 15 17Z',
      ])
      grip.appendChild(gripIcon)
      group.appendChild(grip)

      const dispatchToggle = () => {
        const event = new CustomEvent('tiptap-gutter-toggle', {
          bubbles: true,
          detail: {
            handle: group,
            button: plusButton,
          },
        })
        group.dispatchEvent(event)
      }

      plusButton.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        dispatchToggle()
      })

      plusButton.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          dispatchToggle()
        }
      })

      grip.addEventListener('mousedown', () => {
        grip.setAttribute('aria-expanded', 'true')
      })

      grip.addEventListener('mouseup', () => {
        grip.setAttribute('aria-expanded', 'false')
      })

      return handle
    },
  }),
]
