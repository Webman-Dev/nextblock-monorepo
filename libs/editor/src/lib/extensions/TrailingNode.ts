// libs/editor/src/lib/extensions/TrailingNode.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface TrailingNodeOptions {
  /** Name of the node to append at the end (must exist in your schema) */
  node: string
  /** If the last node’s type is in this list, do nothing */
  notAfter: string[]
}

export const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: 'trailingNode',

  addOptions() {
    return {
      node: 'paragraph',
      notAfter: [], // e.g. ['paragraph'] if you only want one paragraph at end
    }
  },

  addProseMirrorPlugins() {
    const key = new PluginKey('trailingNode')

    return [
      new Plugin({
        key,
        // (transactions, oldState, newState) => Transaction | null
        appendTransaction: (transactions, _oldState, newState) => {
          // Only react when the document actually changed
          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null

          const { doc, schema } = newState
          const lastNode = doc.lastChild
          const targetName = this.options.node
          const targetType = schema.nodes[targetName]
          if (!targetType) return null

          // bail if the last node is already the desired one
          if (lastNode?.type.name === targetName) return null

          // or if the last node is explicitly excluded
          if (lastNode && this.options.notAfter.includes(lastNode.type.name)) return null

          // Insert the trailing node at the end of the document
          // Position at end is doc.content.size per PM docs
          const endPos = doc.content.size
          const tr = newState.tr.insert(endPos, targetType.create())
          return tr
        },
      }),
    ]
  },
})
export default TrailingNode
