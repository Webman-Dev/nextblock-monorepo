import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface EnhancedFocusOptions {
  className: string;
  mode: 'all' | 'deepest' | 'shallowest';
  showFocusRing: boolean;
  highlightSelection: boolean;
  dimUnfocused: boolean;
  animateTransitions: boolean;
}

export const EnhancedFocus = Extension.create<EnhancedFocusOptions>({
  name: 'enhancedFocus',

  addOptions() {
    return {
      className: 'has-focus',
      mode: 'all',
      showFocusRing: true,
      highlightSelection: true,
      dimUnfocused: false,
      animateTransitions: true,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('enhancedFocus'),
        props: {
          decorations: ({ doc, selection }) => {
            const { from, to } = selection;
            const decorations: Decoration[] = [];

            // Add focus decorations
            doc.nodesBetween(from, to, (node, pos) => {
              const decoration = Decoration.node(pos, pos + node.nodeSize, {
                class: this.options.className,
              });

              decorations.push(decoration);
            });

            // Add selection highlight if enabled
            if (this.options.highlightSelection && from !== to) {
              const selectionDecoration = Decoration.inline(from, to, {
                class: 'selection-highlight',
              });
              decorations.push(selectionDecoration);
            }

            // Add focus ring decoration if enabled
            if (this.options.showFocusRing) {
              const focusRingDecoration = Decoration.widget(from, () => {
                const element = document.createElement('div');
                element.className = 'focus-ring';
                return element;
              });
              decorations.push(focusRingDecoration);
            }

            return DecorationSet.create(doc, decorations);
          },
        },
        view: () => ({
          update: (view, prevState) => {
            const { state } = view;
            const { selection } = state;
            const prevSelection = prevState.selection;

            // Handle focus changes
            if (!selection.eq(prevSelection)) {
              this.editor.emit('selectionUpdate', {
                editor: this.editor,
                transaction: state.tr,
              });
            }
          },
        }),
      }),
    ];
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote', 'codeBlock', 'listItem'],
        attributes: {
          'data-focused': {
            default: null,
            renderHTML: (attributes) => {
              if (!attributes['data-focused']) {
                return {};
              }
              return {
                'data-focused': attributes['data-focused'],
              };
            },
          },
        },
      },
    ];
  },

  onCreate() {
    // Add CSS classes to the editor element
    const editorElement = this.editor.view.dom;
    
    if (this.options.animateTransitions) {
      editorElement.classList.add('focus-transitions');
    }
    
    if (this.options.dimUnfocused) {
      editorElement.classList.add('dim-unfocused');
    }
  },

  onSelectionUpdate() {
    const { state } = this.editor;
    const { selection } = state;
    const { from, to } = selection;

    // Update focus attributes on nodes
    const tr = state.tr;
    let hasChanges = false;

    state.doc.descendants((node, pos) => {
      // CRITICAL FIX: Only process element nodes, not text nodes
      if (node.isText || node.isLeaf) {
        return;
      }

      const nodeStart = pos;
      const nodeEnd = pos + node.nodeSize;
      const isFocused = from >= nodeStart && to <= nodeEnd;
      const currentFocused = node.attrs['data-focused'];

      if (isFocused && !currentFocused) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          'data-focused': 'true',
        });
        hasChanges = true;
      } else if (!isFocused && currentFocused) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          'data-focused': null,
        });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.editor.view.dispatch(tr);
    }
  },

  addStorage() {
    return {
      isFocused: false,
    };
  },

  onFocus() {
    const editorElement = this.editor.view.dom;
    editorElement.classList.add('editor-focused');
    
    // Store focus state in extension storage
    this.storage.isFocused = true;
  },

  onBlur() {
    const editorElement = this.editor.view.dom;
    editorElement.classList.remove('editor-focused');
    
    // Store focus state in extension storage
    this.storage.isFocused = false;
  },
});