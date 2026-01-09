import { Node, mergeAttributes } from '@tiptap/core';

// Custom Tiptap Node for <div> Tags
export const DivNode = Node.create({
  name: 'divBlock', // Unique name
  group: 'block',    // Belongs to the 'block' group
  content: 'block*', // Allows zero or more block nodes as content (e.g., nested divs, paragraphs, headings)
  defining: true,    // Helps Tiptap prioritize this node during parsing for 'div' tags
  draggable: true,   // Allows the div block to be dragged if a drag handle is provided by other extensions

  addOptions() {
    return {
      HTMLAttributes: {}, // Default HTML attributes for this node type
    };
  },

  // Explicitly declare common attributes to ensure they are recognized by Tiptap's schema
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('class'),
        renderHTML: (attributes: { class?: string | null }) => {
          return attributes.class ? { class: attributes.class } : {};
        },
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: { style?: string | null }) => {
          return attributes.style ? { style: attributes.style } : {};
        },
      },
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('id'),
        renderHTML: (attributes: { id?: string | null }) => {
          return attributes.id ? { id: attributes.id } : {};
        },
      },
      // For any other attributes, the main parseHTML().getAttrs will capture them into node.attrs,
      // and renderHTML({ node }) will use mergeAttributes(this.options.HTMLAttributes, node.attrs)
      // to apply them. Declaring common ones here helps with schema recognition.
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div',
        priority: 51, // Ensure this rule runs before default paragraph (priority 50) for divs
        getAttrs: domNode => {
          const element = domNode as HTMLElement;

          const MappedAttributes: Record<string, string> = {};
          for (let i = 0; i < element.attributes.length; i++) {
            const attribute = element.attributes[i];
            // Exclude ProseMirror-specific attributes if they cause issues, though generally, they shouldn't be on source HTML.
            // if (!attribute.name.startsWith('data-pm-')) {
            MappedAttributes[attribute.name] = attribute.value;
            // }
          }
          return MappedAttributes;
        },
      },
    ];
  },

  renderHTML({ node }) {
    // node.attrs contains all attributes captured by getAttrs.
    // this.options.HTMLAttributes can provide default attributes for new DivNodes created via commands,
    // but for parsed nodes, node.attrs is king.
    return ['div', mergeAttributes(this.options.HTMLAttributes, node.attrs), 0]; // '0' renders content
  },
});