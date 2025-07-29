import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import AlertWidgetComponent from './components/AlertWidgetComponent';

export default Node.create({
  name: 'alertWidget',
  group: 'block',
  draggable: true,
  defining: true,
  atom: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => ({ 'data-type': attributes.type }),
      },
      title: {
        default: 'Info',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => ({ 'data-title': attributes.title }),
      },
      message: {
        default: '',
        parseHTML: element => element.getAttribute('data-message'),
        renderHTML: attributes => ({ 'data-message': attributes.message }),
      },
      align: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-align'),
        renderHTML: attributes => ({ 'data-align': attributes.align }),
      },
      size: {
        default: 'fit-content',
        parseHTML: element => element.getAttribute('data-size'),
        renderHTML: attributes => ({ 'data-size': attributes.size }),
      },
      textAlign: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-text-align'),
        renderHTML: attributes => ({ 'data-text-align': attributes.textAlign }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-alert-widget]',
        priority: 52, // Must be higher than DivNode's priority (51)
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-alert-widget': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AlertWidgetComponent);
  },

  addCommands() {
    return {
      setAlertWidget: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    alertWidget: {
      setAlertWidget: (options: { type: string; title: string; message: string; align: string; size: string; textAlign: string }) => ReturnType;
    };
  }
}