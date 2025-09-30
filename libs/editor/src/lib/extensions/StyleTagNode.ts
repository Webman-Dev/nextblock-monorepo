import { Node } from '@tiptap/core';

// Custom Tiptap Node for <style> Tags
export const StyleTagNode = Node.create({
  name: 'styleTag',
  group: 'block', // Can be 'topNode' if it should only be at the root
  atom: true, // True if it's a single, indivisible block
  isolating: true, // Prevents content from outside from merging in
  defining: true, // Ensures this node type is preserved
  draggable: false, // Style blocks are usually not draggable

  addAttributes() {
    return {
      cssContent: {
        default: '',
        parseHTML: element => (element as HTMLElement).innerHTML,
        // renderHTML not strictly needed for cssContent if used directly in node's renderHTML
      },
      type: {
        default: 'text/css',
        parseHTML: element => (element as HTMLElement).getAttribute('type'),
        renderHTML: attributes => (attributes.type ? { type: attributes.type } : {}),
      },
      media: {
        default: null,
        parseHTML: element => (element as HTMLElement).getAttribute('media'),
        renderHTML: attributes => (attributes.media ? { media: attributes.media } : {}),
      },
      // Add other common style tag attributes like 'nonce' if needed
    };
  },

  parseHTML() {
    return [
      {
        tag: 'style',
        getAttrs: domNode => {
          const element = domNode as HTMLElement;
          const attrs: Record<string, string | null> = {
            cssContent: element.innerHTML,
            type: element.getAttribute('type'), // Default will be applied if null
          };
          const media = element.getAttribute('media');
          if (media !== null) attrs.media = media; // Only set if attribute exists
          // Capture other attributes here if defined in addAttributes
          return attrs;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // HTMLAttributes should contain resolved attributes like 'type', 'media' from addAttributes().
    // node.attrs.cssContent contains the raw CSS string.
    // We create a clean copy of HTMLAttributes to avoid mutating the passed-in object
    // and ensure 'cssContent' is not accidentally included as an HTML attribute on the <style> tag.
    const finalTagAttributes = { ...HTMLAttributes };
    delete finalTagAttributes.cssContent; // Ensure cssContent is not an attribute

    // Return DOMOutputSpec: ['tag', attributes, content]
    // The content of the <style> tag is the cssContent.
    return ['style', finalTagAttributes, node.attrs.cssContent || ''];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => { // Added parameters for potential use
      const container = document.createElement('div');
      container.setAttribute('data-style-node-placeholder', 'true');
      container.style.border = '1px dashed #999';
      container.style.padding = '8px';
      container.style.margin = '1rem 0';
      container.style.fontFamily = 'monospace';
      container.style.fontSize = '0.9em';
      container.style.color = '#555';
      container.style.cursor = 'pointer';
      container.textContent = '[Custom CSS Block - Edit in Source View]';
      container.contentEditable = 'false'; // Crucial for atom nodes
      container.title = 'Click to open Source View';

      // Open the Source View when clicking the placeholder
      container.addEventListener('click', () => {
        try {
          editor?.chain().focus();
        } catch { /* ignore focus errors */ }
        // Dispatch a custom event the toolbar listens to
        try {
          window.dispatchEvent(new CustomEvent('editor:openSourceView'));
        } catch { /* ignore dispatch errors */ }
      });

      // Optional: Display a snippet of the CSS for context
      // if (node.attrs.cssContent) {
      //   const pre = document.createElement('pre');
      //   pre.style.maxHeight = '50px';
      //   pre.style.overflow = 'hidden';
      //   pre.style.whiteSpace = 'pre-wrap';
      //   pre.textContent = node.attrs.cssContent.substring(0, 100) + (node.attrs.cssContent.length > 100 ? '...' : '');
      //   container.appendChild(pre);
      // }

      return {
        dom: container,
        // update: (updatedNode) => { /* handle updates if necessary */ return false; }
      };
    };
  },
});
