import { Node, mergeAttributes } from '@tiptap/core';

export interface SvgNodeOptions {
  HTMLAttributes: Record<string, any>;
}

export const SvgNode = Node.create<SvgNodeOptions>({
  name: 'svg',
  
  group: 'inline', // Inline to flow with text
  inline: true,
  atom: true,      // Treat as a single unit, no editable content inside

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'inline-block align-middle', // Default styling
      },
    };
  },

  addAttributes() {
    return {
      html: {
        default: '',
      },
      viewBox: {
        default: '0 0 24 24',
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      fill: {
        default: 'none',
      },
      stroke: {
        default: 'currentColor',
      },
      class: {
        default: null,
      },
      style: {
        default: null,
      },
      xmlns: {
        default: 'http://www.w3.org/2000/svg',
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'svg',
        priority: 60,
        getAttrs: (element) => {
          if (!(element instanceof Element)) {
            return false;
          }
          
          // Capture all standard attributes
          const attrs: Record<string, any> = {
            html: element.innerHTML, // Capture the inner content (paths, etc.)
          };

          // Copy attributes
          if (element.getAttribute('viewBox')) attrs.viewBox = element.getAttribute('viewBox');
          if (element.getAttribute('width')) attrs.width = element.getAttribute('width');
          if (element.getAttribute('height')) attrs.height = element.getAttribute('height');
          if (element.getAttribute('fill')) attrs.fill = element.getAttribute('fill');
          if (element.getAttribute('stroke')) attrs.stroke = element.getAttribute('stroke');
          if (element.getAttribute('class')) attrs.class = element.getAttribute('class');
          if (element.getAttribute('style')) attrs.style = element.getAttribute('style');
          if (element.getAttribute('xmlns')) attrs.xmlns = element.getAttribute('xmlns');

          return attrs;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // We cannot easily inject HTML via standard return array for atoms.
    // relying on addNodeView is safer for content injection.
    // But for export (getHTML), we must return the correct structure.
    
    // We can't insert 'html' as an attribute, we need it as content.
    // Since it's an atom, standard PM won't render content.
    // We have to rely on a custom Node View for editor rendering,
    // and for HTML export, maybe we can trick it?
    // Actually, renderHTML is used for toDOM (export).
    // If we return a DOM node, we can set innerHTML.
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const { html, ...otherAttrs } = HTMLAttributes;
    
    // Apply attributes
    Object.entries(mergeAttributes(this.options.HTMLAttributes, otherAttrs)).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
         svg.setAttribute(key, String(value));
      }
    });
    
    // Retrieve innerHTML
    if (html) {
      svg.innerHTML = html;
    }
    
    return {
        dom: svg
    };
  },
  
  addNodeView() {
    return ({ node, HTMLAttributes }) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const { html, ...otherAttrs } = HTMLAttributes; // HTMLAttributes includes node.attrs merged

        // Apply attributes from node.attrs (which are in HTMLAttributes)
        // explicitly filter out 'html' to not set it as attribute
        
        Object.entries(otherAttrs).forEach(([key, value]) => {
             // Filter internal Tiptap attributes if any?
            if (key !== 'html' && value !== null && value !== undefined) {
                svg.setAttribute(key, String(value));
            }
        });

        // Set content
        if (node.attrs.html) {
            svg.innerHTML = node.attrs.html;
        } else if (html) {
            svg.innerHTML = html;
        }

        // Add class for selection handling
        svg.classList.add('parsed-svg-node');

        return {
            dom: svg,
            // ignoreMutation to prevent re-rendering on internal changes if possible, 
            // but for atoms it's usually fine.
        };
    };
  }
});
