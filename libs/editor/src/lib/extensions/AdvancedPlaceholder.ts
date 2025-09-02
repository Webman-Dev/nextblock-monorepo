import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface AdvancedPlaceholderOptions {
  emptyEditorClass: string;
  emptyNodeClass: string;
  placeholder: string | ((props: { node: any; pos: number; hasAnchor: boolean }) => string);
  showOnlyWhenEditable: boolean;
  showOnlyCurrent: boolean;
  includeChildren: boolean;
  considerAnyAsEmpty: boolean;
}

export const AdvancedPlaceholder = Extension.create<AdvancedPlaceholderOptions>({
  name: 'advancedPlaceholder',

  addOptions() {
    return {
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
      placeholder: ({ node }) => {
        // Dynamic placeholders based on node type and context
        if (node.type.name === 'heading') {
          const level = node.attrs.level;
          switch (level) {
            case 1: return "What's the main title?";
            case 2: return "What's this section about?";
            case 3: return "Add a subsection title...";
            case 4: return "Add a heading...";
            case 5: return "Add a small heading...";
            case 6: return "Add a tiny heading...";
            default: return `Heading ${level}`;
          }
        }
        
        if (node.type.name === 'paragraph') {
          // Check if this is the first paragraph in the document
          const isFirstParagraph = node.parent?.firstChild === node;
          if (isFirstParagraph && node.parent?.type.name === 'doc') {
            return "Start writing your story... Press '/' for commands";
          }
          return "Type '/' for commands, or just start writing...";
        }
        
        if (node.type.name === 'taskItem') {
          return 'Add a task...';
        }
        
        if (node.type.name === 'listItem') {
          const parent = node.parent;
          if (parent?.type.name === 'bulletList') {
            return 'Add a bullet point...';
          }
          if (parent?.type.name === 'orderedList') {
            return 'Add a numbered item...';
          }
          return 'Add a list item...';
        }
        
        if (node.type.name === 'blockquote') {
          return 'Add a quote or citation...';
        }
        
        if (node.type.name === 'codeBlock') {
          const language = node.attrs.language;
          return language ? `Write ${language} code...` : 'Write some code...';
        }
        
        // Default fallback
        return 'Start typing...';
      },
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: true,
      considerAnyAsEmpty: false,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('advancedPlaceholder'),
        props: {
          decorations: ({ doc, selection }) => {
            const active = this.editor.isEditable || !this.options.showOnlyWhenEditable;
            const { anchor } = selection;
            const decorations: Decoration[] = [];

            if (!active) {
              return DecorationSet.empty;
            }

            // Add empty editor class
            const isEmpty = doc.content.size === 0 || 
              (doc.content.size === 2 && doc.firstChild?.isTextblock && doc.firstChild.content.size === 0);
            
            if (isEmpty) {
              decorations.push(
                Decoration.widget(0, () => {
                  const element = document.createElement('div');
                  element.className = this.options.emptyEditorClass;
                  return element;
                })
              );
            }

            doc.descendants((node, pos) => {
              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
              const isEmpty = !node.isLeaf && !node.childCount;
              const isEmptyTextBlock = node.isTextblock && node.content.size === 0;
              const isEmptyNode = isEmpty || isEmptyTextBlock;

              if ((hasAnchor || !this.options.showOnlyCurrent) && isEmptyNode) {
                const classes = [this.options.emptyNodeClass];
                
                // Add specific classes based on node type
                if (node.type.name === 'heading') {
                  classes.push(`is-empty-heading-${node.attrs.level}`);
                } else if (node.type.name === 'paragraph') {
                  classes.push('is-empty-paragraph');
                } else if (node.type.name === 'listItem') {
                  classes.push('is-empty-list-item');
                } else if (node.type.name === 'taskItem') {
                  classes.push('is-empty-task-item');
                } else if (node.type.name === 'blockquote') {
                  classes.push('is-empty-blockquote');
                } else if (node.type.name === 'codeBlock') {
                  classes.push('is-empty-code-block');
                }

                const placeholder = typeof this.options.placeholder === 'string'
                  ? this.options.placeholder
                  : this.options.placeholder({ node, pos, hasAnchor });

                const decoration = Decoration.node(pos, pos + node.nodeSize, {
                  'class': classes.join(' '),
                  'data-placeholder': placeholder,
                });

                decorations.push(decoration);
              }

              return this.options.includeChildren;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});