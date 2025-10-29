'use client';

import { Extension, type Editor, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { Suggestion, type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion';
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  CheckSquare,
  TextQuote,
  Code,
  Image as ImageIcon,
  Table2,
  Minus,
  AlertTriangle,
  Megaphone,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Video
} from 'lucide-react';
import React from 'react';

// Floating UI (replaces tippy.js)
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  type VirtualElement
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
  // Text formatting
  {
    title: 'Text',
    description: 'Start writing with plain text.',
    icon: React.createElement(Type, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).clearNodes().run();
    },
  },
  
  // Headings
  {
    title: 'Heading 1',
    description: 'Large section heading.',
    icon: React.createElement(Heading1, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: React.createElement(Heading2, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: React.createElement(Heading3, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Heading 4',
    description: 'Extra small section heading.',
    icon: React.createElement(Heading4, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 4 }).run();
    },
  },
  {
    title: 'Heading 5',
    description: 'Tiny section heading.',
    icon: React.createElement(Heading5, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 5 }).run();
    },
  },
  {
    title: 'Heading 6',
    description: 'Smallest section heading.',
    icon: React.createElement(Heading6, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 6 }).run();
    },
  },

  // Lists
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list.',
    icon: React.createElement(List, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering.',
    icon: React.createElement(ListOrdered, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Create a list with checkboxes.',
    icon: React.createElement(CheckSquare, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },

  // Block elements
  {
    title: 'Blockquote',
    description: 'Create a quote or citation.',
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
    title: 'Horizontal Rule',
    description: 'Insert a horizontal divider.',
    icon: React.createElement(Minus, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },

  // Media
  {
    title: 'Image',
    description: 'Insert an image from URL.',
    icon: React.createElement(ImageIcon, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      const url = window.prompt('Enter image URL:');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },

  // Tables
  {
    title: 'Table',
    description: 'Insert a table with rows and columns.',
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

  // Text alignment
  {
    title: 'Align Left',
    description: 'Align text to the left.',
    icon: React.createElement(AlignLeft, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('left').run();
    },
  },
  {
    title: 'Align Center',
    description: 'Center align text.',
    icon: React.createElement(AlignCenter, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('center').run();
    },
  },
  {
    title: 'Align Right',
    description: 'Align text to the right.',
    icon: React.createElement(AlignRight, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('right').run();
    },
  },
  {
    title: 'Justify',
    description: 'Justify text alignment.',
    icon: React.createElement(AlignJustify, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setTextAlign('justify').run();
    },
  },

  // Media
  {
    title: 'Video',
    description: 'Embed a video from URL.',
    icon: React.createElement(Video, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      const url = window.prompt('Enter video URL (YouTube, Vimeo, etc.):');
      if (url) {
        // For now, insert as a link - we'll enhance this later with proper video embedding
        editor.chain().focus().deleteRange(range).insertContent(`<p><a href="${url}" target="_blank">Video: ${url}</a></p>`).run();
      }
    },
  },

  // Custom widgets (if available)
  {
    title: 'Alert',
    description: 'Insert an alert or notice.',
    icon: React.createElement(AlertTriangle, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      // Check if the command exists before using it
      if (editor.can().setAlertWidget()) {
        editor.chain().focus().deleteRange(range).setAlertWidget().run();
      } else {
        // Fallback to blockquote if custom widget not available
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      }
    },
  },
  {
    title: 'Call to Action',
    description: 'Insert a call to action button.',
    icon: React.createElement(Megaphone, { className: 'h-5 w-5' }),
    command: ({ editor, range }) => {
      // Check if the command exists before using it
      if (editor.can().setCtaWidget()) {
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
          })
          .run();
      } else {
        // Fallback to regular text if custom widget not available
        editor.chain().focus().deleteRange(range).insertContent('Call to Action').run();
      }
    },
  },
];

interface SlashCommandOptions {
  suggestion: Partial<SuggestionOptions>;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        allowedPrefixes: [' '],
        startOfLine: false,
        decorationTag: 'span',
        decorationClass: 'slash-command',
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        char: '/',
        allowSpaces: false,
        allowedPrefixes: [' '],
        startOfLine: false,
        decorationTag: 'span',
        decorationClass: 'slash-command',
        editor: this.editor,
        
        items: ({ query }: { query: string }) => {
          const filteredItems = commandItems.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase())
          );
          return filteredItems.slice(0, 10);
        },

        command: ({ editor, range, props }: { editor: Editor; range: Range; props: CommandItemProps }) => {
          props.command({ editor, range });
        },

        render: () => {
          let component: ReactRenderer<CommandListRef> | null = null;
          let popupEl: HTMLDivElement | null = null;
          let stopAutoUpdate: (() => void) | null = null;

          // Create virtual reference element using Tiptap's clientRect directly
          const createVirtualReference = (clientRect: (() => DOMRect | null)): VirtualElement => ({
            getBoundingClientRect: () => {
              const rect = clientRect();
              return rect || new DOMRect(0, 0, 0, 0);
            },
          });

          // Simple positioning using Tiptap's clientRect and fixed positioning
          const positionPopup = async (clientRect: (() => DOMRect | null)) => {
            if (!popupEl) return;
            
            const reference = createVirtualReference(clientRect);
            
            const { x, y } = await computePosition(reference, popupEl, {
              placement: 'bottom-start',
              middleware: [
                offset(6),
                flip({
                  fallbackPlacements: ['top-start', 'bottom-start'],
                }),
                shift({
                  padding: 8,
                }),
                size({
                  apply({ availableWidth, availableHeight, elements }) {
                    Object.assign(elements.floating.style, {
                      maxWidth: `${Math.min(288, availableWidth - 16)}px`,
                      maxHeight: `${Math.min(288, availableHeight - 16)}px`,
                    });
                  },
                }),
              ],
              strategy: 'fixed', // Use fixed positioning relative to viewport
            });
            
            // Apply positioning directly using fixed coordinates from Tiptap's clientRect
            popupEl.style.left = `${Math.round(x)}px`;
            popupEl.style.top = `${Math.round(y)}px`;
          };

          return {
            onStart: (props: SuggestionProps<CommandItemProps>) => {
              // Tiptap v3 always provides clientRect in suggestion props
              if (!props.clientRect) {
                return;
              }

              const clientRect = props.clientRect; // Store reference for type safety

              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });

              // Create popup element with fixed positioning
              popupEl = document.createElement('div');
              popupEl.style.position = 'fixed';
              popupEl.style.zIndex = '10000';
              popupEl.style.top = '0';
              popupEl.style.left = '0';
              popupEl.style.pointerEvents = 'none';
              popupEl.appendChild(component.element);
              
              // Re-enable all pointer events on the list itself (including wheel events)
              (component.element as HTMLElement).style.pointerEvents = 'auto';
              
              // Ensure wheel events can bubble up to the container
              (component.element as HTMLElement).addEventListener('wheel', (e) => {
                e.stopPropagation();
              }, { passive: true });

              // Append to document body for fixed positioning
              document.body.appendChild(popupEl);

              // Setup auto-update positioning using Tiptap's clientRect
              const reference = createVirtualReference(clientRect);
              stopAutoUpdate = autoUpdate(reference, popupEl, () => positionPopup(clientRect));
              
              // Initial positioning
              void positionPopup(clientRect);
            },

            onUpdate: (props: SuggestionProps<CommandItemProps>) => {
              component?.updateProps(props);
              // Update position using the new clientRect from Tiptap
              if (props.clientRect) {
                void positionPopup(props.clientRect);
              }
            },

            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
              if (event.key === 'Escape') return true;
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






