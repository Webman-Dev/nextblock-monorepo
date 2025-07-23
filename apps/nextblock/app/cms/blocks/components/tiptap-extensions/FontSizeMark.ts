import { Mark, mergeAttributes } from '@tiptap/core';

// Custom Tiptap extension for Font Size
export interface FontSizeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (className: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSizeMark = Mark.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      'data-font-size': {
        default: null,
        parseHTML: element => (element as HTMLElement).getAttribute('data-font-size'),
        renderHTML: attributes => {
          if (!attributes['data-font-size']) {
            return {};
          }
          return { class: attributes['data-font-size'] as string };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-font-size]',
        getAttrs: element => {
          const fontSizeClass = (element as HTMLElement).getAttribute('data-font-size');
          return fontSizeClass ? { 'data-font-size': fontSizeClass } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setFontSize: (className) => ({ commands }) => {
        if (!className) {
          return commands.setMark(this.name, { 'data-font-size': className });
        }
        return commands.setMark(this.name, { 'data-font-size': className });
      },
      unsetFontSize: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});