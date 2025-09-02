import { Extension } from '@tiptap/core'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import Blockquote from '@tiptap/extension-blockquote'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'

// Create draggable versions of nodes
export const DraggableParagraph = Paragraph.extend({
  draggable: true,
})

export const DraggableHeading = Heading.extend({
  draggable: true,
})

export const DraggableBlockquote = Blockquote.extend({
  draggable: true,
})

export const DraggableBulletList = BulletList.extend({
  draggable: true,
})

export const DraggableOrderedList = OrderedList.extend({
  draggable: true,
})

export const DraggableTaskList = TaskList.extend({
  draggable: true,
})

export const DraggableTaskItem = TaskItem.extend({
  draggable: true,
})

export const DraggableCodeBlock = CodeBlockLowlight.extend({
  draggable: true,
})

export const DraggableImage = Image.extend({
  draggable: true,
})

// Extension to make all nodes draggable
export const DraggableNodes = Extension.create({
  name: 'draggableNodes',

  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'blockquote',
          'bulletList',
          'orderedList',
          'taskList',
          'taskItem',
          'codeBlock',
          'image',
        ],
        attributes: {
          draggable: {
            default: true,
            parseHTML: () => true,
            renderHTML: () => ({
              'data-draggable': 'true',
            }),
          },
        },
      },
    ]
  },
})