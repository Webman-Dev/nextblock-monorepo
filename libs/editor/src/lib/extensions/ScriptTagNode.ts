import { Node } from '@tiptap/core';

// Custom Tiptap Node for <script> tags
// IMPORTANT: This renders a non-executing placeholder while editing.
// The actual <script> tag is only emitted in exported HTML (renderHTML).
export const ScriptTagNode = Node.create({
  name: 'scriptTag',
  group: 'block',
  atom: true,
  isolating: true,
  defining: true,
  draggable: false,

  addAttributes() {
    return {
      jsContent: {
        default: '',
        parseHTML: element => (element as HTMLElement).innerHTML,
      },
      type: {
        default: 'text/javascript',
        parseHTML: element => (element as HTMLElement).getAttribute('type'),
        renderHTML: attributes => (attributes.type ? { type: attributes.type } : {}),
      },
      src: {
        default: null as string | null,
        parseHTML: element => (element as HTMLElement).getAttribute('src'),
        renderHTML: attributes => (attributes.src ? { src: attributes.src } : {}),
      },
      async: {
        default: null as string | null,
        parseHTML: element => (element as HTMLElement).getAttribute('async'),
        renderHTML: attributes => (attributes.async != null ? { async: '' } : {}),
      },
      defer: {
        default: null as string | null,
        parseHTML: element => (element as HTMLElement).getAttribute('defer'),
        renderHTML: attributes => (attributes.defer != null ? { defer: '' } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'script',
        getAttrs: domNode => {
          const el = domNode as HTMLElement;
          const attrs: Record<string, string | null> = {
            jsContent: el.innerHTML,
            type: el.getAttribute('type'),
          };
          const src = el.getAttribute('src');
          if (src !== null) attrs.src = src;
          if (el.hasAttribute('async')) attrs.async = '';
          if (el.hasAttribute('defer')) attrs.defer = '';
          return attrs;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = { ...HTMLAttributes };
    delete (attrs as any).jsContent;
    // If src is provided, prefer external script without inline content
    return ['script', attrs, node.attrs.src ? '' : (node.attrs.jsContent || '')];
  },

  addNodeView() {
    return ({ editor }) => {
      const container = document.createElement('div');
      container.setAttribute('data-script-node-placeholder', 'true');
      container.style.border = '1px dashed #999';
      container.style.padding = '8px';
      container.style.margin = '1rem 0';
      container.style.fontFamily = 'monospace';
      container.style.fontSize = '0.9em';
      container.style.color = '#555';
      container.style.cursor = 'pointer';
      container.textContent = '[Custom JavaScript Block - Edit in Source View]';
      container.contentEditable = 'false';
      container.title = 'Click to open Source View';

      // Open the Source View when clicking the placeholder
      container.addEventListener('click', () => {
        try {
          editor?.chain().focus();
        } catch { /* ignore focus errors */ }
        try {
          window.dispatchEvent(new CustomEvent('editor:openSourceView'));
        } catch { /* ignore dispatch errors */ }
      });
      return { dom: container };
    };
  },
});
