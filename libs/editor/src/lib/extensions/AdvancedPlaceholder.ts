import Placeholder, { type PlaceholderOptions } from '@tiptap/extension-placeholder';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

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
  const { editor, node } = context;
  const nodeName = node.type.name;
  const doc = editor.state.doc;
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

  if (nodeName === 'paragraph') {
    const isFirstTopLevelParagraph = doc.firstChild === node;

    if (isFirstTopLevelParagraph) {
      return "Write, type '/' for commands...";
    }

    if (parent && parent.type.name === 'blockquote') {
      return 'Start a quote...';
    }

    return "Press '/' for commands or just start typing...";
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

  if (nodeName === 'blockquote') {
    return 'Capture a quote...';
  }

  if (nodeName === 'codeBlock') {
    const language = node.attrs.language as string | undefined;
    return language ? `Write ${language} code...` : 'Write some code...';
  }

  return 'Start typing...';
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
});
