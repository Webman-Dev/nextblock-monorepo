import { Node, mergeAttributes } from '@tiptap/core';

export interface SpanNodeOptions {
  HTMLAttributes: Record<string, any>;
}

export const SpanNode = Node.create<SpanNodeOptions>({
  name: 'spanComponent', // Internal name
  
  group: 'inline',
  inline: true,
  content: 'inline*', // Allows text or other inline nodes (like other spans, images, etc.) inside

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
            if (!attributes.class) return {};
            return { class: attributes.class };
        },
      },
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
            if (!attributes.style) return {};
            return { style: attributes.style };
        },
      },
      // You can add more attributes if needed (e.g. data attributes)
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        // Priority must be managed. TextStyle usually matches span with style. 
        // We want to capture spans that specifically have classes (which TextStyle ignores/strips).
        // If a span has BOTH, we want to capture it as a Node to preserve the class.
        priority: 60, 
        getAttrs: (element) => {
            if (!(element instanceof HTMLElement)) return false;
            
            // Only capture if it has a class. 
            // If it ONLY has style, let TextStyle handle it (unless we want consistency).
            // But complex Tailwind spans rely on class.
            if (element.hasAttribute('class')) {
                return {};
            }
            return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});
