import { Editor, Range } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react';
import { CommandsList, type CommandsListRef } from './CommandsList';

export default {
  char: '/',
  command: ({ editor, range, props }: { editor: Editor; range: Range; props: any }) => {
    props.command({ editor, range });
  },
  items: ({ query }: { query: string }) => {
    return [
      {
        title: 'H1',
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
      },
      {
        title: 'H2',
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
      },
      {
        title: 'Bold',
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).setMark('bold').run();
        },
      },
      {
        title: 'Italic',
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).setMark('italic').run();
        },
      },
    ]
      .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 10);
  },
  render: () => {
    let component: ReactRenderer<CommandsListRef>;

    return {
      onStart: (props: { editor: Editor; clientRect: () => DOMRect }) => {
        component = new ReactRenderer(CommandsList, {
          props,
          editor: props.editor,
        });
      },

      onUpdate: (props: { editor: Editor; clientRect: () => DOMRect }) => {
        component.updateProps(props);
      },

      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'Escape') {
          return true;
        }
        return component.ref?.onKeyDown?.(event) ?? false;
      },

      onExit: () => {
        component.destroy();
      },
    };
  },
};
