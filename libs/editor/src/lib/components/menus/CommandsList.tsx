import React, { forwardRef, useImperativeHandle, useState } from 'react'
import type { Editor, Range } from '@tiptap/core'

export type CommandsListRef = {
  onKeyDown: (event: KeyboardEvent) => boolean
}

type Item = {
  title: string
  command: ({ editor, range }: { editor: Editor; range: Range }) => void
}

type CommandsListProps = {
  editor: Editor
  range: Range
  items: Item[]
  command: ({ editor, range }: { editor: Editor; range: Range }) => void
}

export const CommandsList = forwardRef<CommandsListRef, CommandsListProps>(
  ({ items, command, editor, range }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex]
          if (item) item.command({ editor, range })
          return true
        }
        return false
      },
    }))

    // ...render your list using selectedIndex...
    return (
      <div role="menu" aria-label="Slash commands">
        {items.map((it, i) => (
          <div key={it.title} role="option" aria-selected={i === selectedIndex}>
            {it.title}
          </div>
        ))}
      </div>
    )
  }
)