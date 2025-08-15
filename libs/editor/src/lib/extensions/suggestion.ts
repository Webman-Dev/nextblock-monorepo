// libs/editor/src/lib/extensions/suggestion.ts
'use client'

import type { Editor, Range } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import suggestion, {
  type SuggestionOptions as TiptapSuggestionOptions,
  type SuggestionProps as TiptapSuggestionProps,
} from '@tiptap/suggestion'
import {
  computePosition,
  offset,
  flip,
  shift,
  autoUpdate,
  type VirtualElement,
} from '@floating-ui/dom'

import { CommandsList } from '../components/menus/CommandsList'

/** Virtual element that ALWAYS returns a DOMRect (never null). */
function makeVirtualElement(getRect?: (() => DOMRect | null) | null): VirtualElement {
  return {
    getBoundingClientRect: () => (getRect?.() ?? new DOMRect(0, 0, 0, 0)),
  }
}

export type CommandItem = {
  title: string
  command: (args: { editor: Editor; range: Range }) => void
}

const items: CommandItem[] = [
  {
    title: 'H1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    },
  },
  {
    title: 'H2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    },
  },
  {
    title: 'bold',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBold().run()
    },
  },
  {
    title: 'italic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleItalic().run()
    },
  },
]

export type SuggestionProps<T> = TiptapSuggestionProps<T>
export type SuggestionOptions<T, P> = TiptapSuggestionOptions<T, P>

/**
 * Factory that returns fully-typed SuggestionOptions (with `editor`) for Tiptap v3.
 * Use inside an Extension: `suggestion(createSlashSuggestionOptions(this.editor))`
 */
export function createSlashSuggestionOptions(
  editor: Editor,
): SuggestionOptions<CommandItem, any> {
  return {
    editor,            // <-- required by the type
    char: '/',
    items: ({ query }) =>
      items
        .filter((i) => i.title.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 10),

    render: () => {
      let component: ReactRenderer | null = null
      let popupEl: HTMLDivElement | null = null
      let cleanupAutoUpdate: (() => void) | null = null

      const position = async (props: SuggestionProps<CommandItem>) => {
        if (!popupEl) return
        const reference = makeVirtualElement(props.clientRect ?? null)

        const { x, y } = await computePosition(reference, popupEl, {
          placement: 'bottom-start',
          middleware: [offset(4), flip(), shift()],
        })

        if (!popupEl) return
        Object.assign(popupEl.style, {
          position: 'absolute',
          left: `${Math.round(x)}px`,
          top: `${Math.round(y)}px`,
        } as CSSStyleDeclaration)
      }

      return {
        onStart: (props: SuggestionProps<CommandItem>) => {
          popupEl = document.createElement('div')
          popupEl.className = 'tiptap-cmdmenu z-50'
          Object.assign(popupEl.style, {
            position: 'absolute',
            inset: 'auto',
            zIndex: '9999',
          } as CSSStyleDeclaration)
          document.body.appendChild(popupEl)

          component = new ReactRenderer(CommandsList, {
            props,
            editor: props.editor,
            as: 'div',
          })
          popupEl.appendChild(component.element)

          const reference = makeVirtualElement(props.clientRect ?? null)
          cleanupAutoUpdate = autoUpdate(reference, popupEl, () => {
            void position(props)
          })

          void position(props)
        },

        onUpdate: (props: SuggestionProps<CommandItem>) => {
          component?.updateProps(props)
          void position(props)
        },

        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === 'Escape') {
            props.event.stopPropagation()
            return true
          }
          return (component?.ref as any)?.onKeyDown?.(props) ?? false
        },

        onExit: () => {
          if (cleanupAutoUpdate) {
            cleanupAutoUpdate()
            cleanupAutoUpdate = null
          }
          component?.destroy()
          component = null
          popupEl?.remove()
          popupEl = null
        },
      }
    },
  }
}

/** Convenience export if you prefer: call `slashSuggestion(editor)` in your Extension. */
export const slashSuggestion = (editor: Editor) => suggestion(createSlashSuggestionOptions(editor))
