'use client';

import { Extension, type Editor, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import suggestion, { type SuggestionProps } from '@tiptap/suggestion';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  TextQuote,
  Code,
  Image as ImageIcon,
  Table2,
  Minus,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';
import React from 'react';

// Floating UI (replaces tippy.js)
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  type VirtualElement,
} from '@floating-ui/dom';

import {
  SlashCommandList,
  type CommandListRef,
} from '../components/menus/SlashCommandList';

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
    icon: React.createElement(Heading1, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: React.createElement(Heading2, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: React.createElement(Heading3, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list.',
    icon: React.createElement(List, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Ordered List',
    description: 'Create a list with numbering.',
    icon: React.createElement(ListOrdered, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Blockquote',
    description: 'Create a quote.',
    icon: React.createElement(TextQuote, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Create a code block with syntax highlighting.',
    icon: React.createElement(Code, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Image',
    description: 'Insert an image.',
    icon: React.createElement(ImageIcon, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      const url = window.prompt('URL');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: 'Table',
    description: 'Insert a table.',
    icon: React.createElement(Table2, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: 'Horizontal Rule',
    description: 'Insert a horizontal rule.',
    icon: React.createElement(Minus, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Alert',
    description: 'Insert an alert.',
    icon: React.createElement(AlertTriangle, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setAlertWidget().run();
    },
  },
  {
    title: 'Call to Action',
    description: 'Insert a call to action.',
    icon: React.createElement(Megaphone, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setCtaWidget({
          text: 'Click me',
          url: '#',
          style: 'primary',
          size: 'medium',
          textAlign: 'center',
          align: 'center',
        })
        .run();
    },
  },
];

export const SlashCommand = Extension.create({
  name: 'slash-command',

  addProseMirrorPlugins() {
    return [
      // ✅ Use the Suggestion plugin directly (no `new Plugin`)
      suggestion<CommandItemProps>({
        char: '/',
        editor: this.editor,
        items: ({ query }) =>
          commandItems
            .filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()))
            .slice(0, 10),

        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },

        render: () => {
          let component: ReactRenderer<CommandListRef> | null = null;
          let popupEl: HTMLDivElement | null = null;
          let stopAutoUpdate: (() => void) | null = null;

          // Virtual reference element for Floating UI that always returns a DOMRect
          const toDomRectFn = (getRect?: (() => DOMRect | null) | null): (() => DOMRect) =>
            !getRect ? () => new DOMRect(0, 0, 0, 0) : () => getRect() ?? new DOMRect(0, 0, 0, 0);

          const makeReferenceEl = (
            clientRect?: (() => DOMRect | null) | null,
          ): VirtualElement => ({
            getBoundingClientRect: toDomRectFn(clientRect),
          });

          const positionPopup = async (clientRect?: (() => DOMRect | null) | null) => {
            if (!popupEl) return;
            const reference = makeReferenceEl(clientRect);
            const { x, y } = await computePosition(reference, popupEl, {
              placement: 'bottom-start',
              middleware: [offset(6), flip(), shift({ padding: 8 })],
            });
            if (popupEl) {
              popupEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
            }
          };

          return {
            onStart: (props: SuggestionProps<CommandItemProps>) => {
              if (!props.clientRect) return; // ✅ don't mount without an anchor

              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });

              popupEl = document.createElement('div');
              // keep editor focus by default
              popupEl.style.position = 'fixed'; // fixed avoids parent transforms; use absolute if you prefer
              popupEl.style.zIndex = '10000';
              popupEl.style.top = '0';
              popupEl.style.left = '0';
              popupEl.style.pointerEvents = 'none'; // ✅ shell ignores pointer events
              popupEl.appendChild(component.element);
              // re-enable clicks on the list itself
              (component.element as HTMLElement).style.pointerEvents = 'auto'; // ✅ list remains clickable

              document.body.appendChild(popupEl);

              const reference = makeReferenceEl(props.clientRect);
              stopAutoUpdate = autoUpdate(reference, popupEl, () => positionPopup(props.clientRect));
              void positionPopup(props.clientRect);
            },

            onUpdate: (props: SuggestionProps<CommandItemProps>) => {
              component?.updateProps(props);
              void positionPopup(props.clientRect);
            },

            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
              if (event.key === 'Escape') return true; // let onExit clean up
              // Up/Down/Enter handled by list; return false for other keys so typing continues
              return component?.ref?.onKeyDown({ event }) ?? false;
            },

            onExit: () => {
              stopAutoUpdate?.();
              stopAutoUpdate = null;
              component?.destroy();
              component = null;
              popupEl?.remove();
              popupEl = null;
            },
          };
        },
      }),
    ];
  },
});
