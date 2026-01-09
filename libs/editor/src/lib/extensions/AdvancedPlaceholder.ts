import Placeholder, { type PlaceholderOptions } from '@tiptap/extension-placeholder';
import type { Editor } from '@tiptap/core';
import { isNodeEmpty } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export type AdvancedPlaceholderOptions = PlaceholderOptions;

type PlaceholderContext = {
  editor: Editor;
  node: ProseMirrorNode;
  pos: number;
  hasAnchor: boolean;
};

const getParentNode = (context: PlaceholderContext) => {
  const { editor, pos } = context;
  const resolved = editor.state.doc.resolve(Math.max(pos, 0));

  return resolved.depth > 0 ? resolved.node(resolved.depth - 1) : null;
};

const getPlaceholderText = (context: PlaceholderContext): string => {
  const defaultPlaceholder = 'Press "/" to insert or start typing...';
  const { node } = context;
  const nodeName = node.type.name;
  const parent = getParentNode(context);

  if (nodeName === 'heading') {
    const level = node.attrs.level ?? 1;

    switch (level) {
      case 1:
        return 'Add a title...';
      case 2:
        return 'Add a section heading...';
      case 3:
        return 'Add a subheading...';
      default:
        return `Heading ${level}`;
    }
  }

  if (nodeName === 'taskItem') {
    return 'Add a task...';
  }

  if (nodeName === 'listItem') {
    const parentName = parent?.type.name;

    if (parentName === 'bulletList') {
      return 'Add a bullet...';
    }

    if (parentName === 'orderedList') {
      return 'Add a numbered item...';
    }

    return 'Add a list item...';
  }

  if (nodeName === 'codeBlock') {
    const language = node.attrs.language as string | undefined;
    return language ? `Write ${language} code...` : 'Write some code...';
  }

  if (nodeName === 'paragraph') {
    const parentName = parent?.type.name;
    if (!parentName || parentName === 'doc') {
      return defaultPlaceholder;
    }
  }

  if (nodeName === 'doc') {
    return defaultPlaceholder;
  }

  return '';
};

export const AdvancedPlaceholder = Placeholder.extend<AdvancedPlaceholderOptions>({
  addOptions() {
    const parentOptions = this.parent?.() as PlaceholderOptions | undefined;

    return {
      ...parentOptions,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
      includeChildren: true,
      showOnlyCurrent: true,
      showOnlyWhenEditable: true,
      placeholder: (props) => getPlaceholderText(props as PlaceholderContext),
    };
  },

  addProseMirrorPlugins() {
    const tableContextNodes = new Set(['table', 'tableCell', 'tableHeader', 'tableRow']);
    const isWithinTable = (pos: number): boolean => {
      const resolved = this.editor.state.doc.resolve(pos);
      for (let depth = resolved.depth; depth >= 0; depth -= 1) {
        const ancestor = resolved.node(depth);
        if (tableContextNodes.has(ancestor.type.name)) {
          return true;
        }
      }
      return false;
    };

    return [
      new Plugin({
        key: new PluginKey('placeholder'),
        props: {
          decorations: ({ doc, selection }) => {
            const active = this.editor.isEditable || !this.options.showOnlyWhenEditable;

            if (!active) {
              return null;
            }

            const { anchor } = selection;
            const decorations: Decoration[] = [];
            const isEmptyDoc = this.editor.isEmpty;

            doc.descendants((node, pos) => {
              if (isWithinTable(pos)) {
                return this.options.includeChildren;
              }

              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
              const isEmpty = !node.isLeaf && isNodeEmpty(node);

              if ((hasAnchor || !this.options.showOnlyCurrent) && isEmpty) {
                const classes = [this.options.emptyNodeClass];

                if (isEmptyDoc) {
                  classes.push(this.options.emptyEditorClass);
                }

                const placeholderValue =
                  typeof this.options.placeholder === 'function'
                    ? this.options.placeholder({
                        editor: this.editor,
                        node,
                        pos,
                        hasAnchor,
                      })
                    : this.options.placeholder;

                const decoration = Decoration.node(pos, pos + node.nodeSize, {
                  class: classes.join(' '),
                  'data-placeholder': placeholderValue,
                });

                decorations.push(decoration);
              }

              return this.options.includeChildren;
            });

            return decorations.length ? DecorationSet.create(doc, decorations) : null;
          },
        },
      }),
    ];
  },
});
