import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react'
import type { CommandItemProps } from '../../extensions/slash-command'
import { cn } from '@nextblock-monorepo/utils'

interface SlashCommandListProps {
  items: CommandItemProps[]
  command: (item: CommandItemProps) => void
}

export interface CommandListRef {
  // ReactRenderer passes a native KeyboardEvent
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean
}

export const SlashCommandList = forwardRef<CommandListRef, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement | null>(null)

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) command(item)
    }

    // Clamp + reset selection when items change
    useEffect(() => {
      if (items.length === 0) {
        setSelectedIndex(0)
        return
      }
      setSelectedIndex((prev) => {
        const next = Math.min(Math.max(prev, 0), items.length - 1)
        return Number.isFinite(next) ? next : 0
      })
    }, [items])

    // Ensure the active option stays visible
    useEffect(() => {
      if (!containerRef.current) return
      const el = containerRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
      if (el) el.scrollIntoView({ block: 'nearest' })
    }, [selectedIndex])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false

        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedIndex((i) => (i - 1 + items.length) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedIndex((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    return (
      <div
        ref={containerRef}
        className="z-50 max-h-72 w-72 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        role="listbox"
        aria-activedescendant={`cmd-opt-${selectedIndex}`}
        tabIndex={-1} // ✅ makes it programmatically focusable without adding it to tab order
      >
        {items.length > 0 ? (
          items.map((item, index) => {
            const active = index === selectedIndex
            return (
              <button
                key={`${item.title}-${index}`}
                id={`cmd-opt-${index}`}
                data-index={index}
                role="option"
                aria-selected={active}
                type="button"
                // keep editor focus so the suggestion plugin stays mounted
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(index)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm p-2 text-left text-sm',
                  active && 'bg-accent text-accent-foreground'
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              </button>
            )
          })
        ) : (
          <div className="p-2 text-sm text-muted-foreground">No results</div>
        )}
      </div>
    )
  }
)

SlashCommandList.displayName = 'SlashCommandList'
