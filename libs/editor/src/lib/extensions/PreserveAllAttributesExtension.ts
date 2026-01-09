import { Extension } from '@tiptap/core';

// Extension to preserve specified HTML attributes on various node types
export const PreserveAllAttributesExtension = Extension.create({
  name: 'preserveAllAttributesExtension',

  addGlobalAttributes() {
    return [
      {
        types: [ // Ensure 'divBlock' is NOT listed here as DivNode handles its own attributes.
          'paragraph',
          'heading',
          'listItem',
          'blockquote',
          'codeBlock', // Added back as it's a common block element
          'bulletList', // ul
          'orderedList', // ol
          'textStyle', // span (though typically for inline, can have global attrs)
          // 'horizontalRule', // Example if you use it
          // 'image', // Example if you use it and want global attrs beyond what ImageExtension provides
        ],
        attributes: {
          style: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('style'),
            renderHTML: (attributes: { style?: string | null }) => {
              return attributes.style ? { style: attributes.style } : {};
            },
          },
          class: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('class'),
            renderHTML: (attributes: { class?: string | null }) => {
              return attributes.class ? { class: attributes.class } : {};
            },
          },
          id: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('id'),
            renderHTML: (attributes: { id?: string | null }) => {
              return attributes.id ? { id: attributes.id } : {};
            },
          },
          // Generic handler for data-* attributes
          dataAttributes: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const dataAttrs: Record<string, string> = {};
              for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                if (attr.name.startsWith('data-')) {
                  dataAttrs[attr.name] = attr.value;
                }
              }
              return Object.keys(dataAttrs).length > 0 ? dataAttrs : null;
            },
            renderHTML: (attributes: { dataAttributes?: Record<string, string> | null }) => {
              // This will return an object like { "data-foo": "bar", "data-id": "123" }
              // Tiptap should then spread these as attributes on the rendered HTML element.
              return attributes.dataAttributes || {};
            },
          }
        },
      },
    ];
  },
});