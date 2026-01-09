import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CtaWidgetComponent from './components/CtaWidgetComponent';

export default Node.create({
  name: 'ctaWidget',
  group: 'block',
  draggable: true,
  atom: true,
  defining: true,

  addAttributes() {
    return {
      text: {
        default: 'Click Here',
        parseHTML: element => element.getAttribute('data-text'),
        renderHTML: attributes => ({ 'data-text': attributes.text }),
      },
      url: {
        default: '#',
        parseHTML: element => element.getAttribute('data-url'),
        renderHTML: attributes => ({ 'data-url': attributes.url }),
      },
      style: {
        default: 'primary',
        parseHTML: element => element.getAttribute('data-style'),
        renderHTML: attributes => ({ 'data-style': attributes.style }),
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
        tag: 'div[data-cta-widget]',
        priority: 52, // Must be higher than DivNode's priority (51)
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-cta-widget': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaWidgetComponent);
  },

  addCommands() {
    return {
      setCtaWidget: (options = {}) => ({ commands }) => {
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
    ctaWidget: {
      setCtaWidget: (options?: { text?: string; url?: string; style?: string; size?: string; textAlign?: string }) => ReturnType;
    };
  }
}