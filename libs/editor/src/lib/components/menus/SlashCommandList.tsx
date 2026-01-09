import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react'
import type { CommandItemProps } from '../../extensions/slash-command'
import { cn } from '@nextblock-cms/utils'

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
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement | null>(null)

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) command(item)
    }

    // Clamp + reset selection when items change
    useEffect(() => {
      if (items.length === 0) {
        setSelectedIndex(-1)
        return
      }
      setSelectedIndex((prev) => {
        // If currently no selection (-1), keep it as no selection
        if (prev === -1) {
          return -1
        }
        // Otherwise clamp the selection to valid range
        const next = Math.min(Math.max(prev, 0), items.length - 1)
        return Number.isFinite(next) ? next : -1
      })
    }, [items])

    // Ensure the active option stays visible
    useEffect(() => {
      if (!containerRef.current || selectedIndex === -1) return
      const el = containerRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
      if (el) el.scrollIntoView({ block: 'nearest' })
    }, [selectedIndex])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false

        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedIndex((i) => {
            if (i === -1) {
              // If no selection, go to last item
              return items.length - 1
            }
            return (i - 1 + items.length) % items.length
          })
          return true
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedIndex((i) => {
            if (i === -1) {
              // If no selection, go to first item
              return 0
            }
            return (i + 1) % items.length
          })
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          // Only execute if an item is actually selected
          if (selectedIndex !== -1) {
            selectItem(selectedIndex)
          }
          return true
        }
        return false
      },
    }))

    // Handle wheel events to ensure smooth scrolling
    const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation()
      // Allow default scrolling behavior
    }

    return (
      <div
        ref={containerRef}
        className="z-50 max-h-72 w-72 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        role="listbox"
        aria-activedescendant={selectedIndex !== -1 ? `cmd-opt-${selectedIndex}` : undefined}
        tabIndex={-1} // ✅ makes it programmatically focusable without adding it to tab order
        onWheel={handleWheel}
        style={{
          scrollbarWidth: 'thin', // For Firefox
          scrollbarColor: 'rgb(148 163 184) transparent' // For Firefox
        }}
      >
        {items.length > 0 ? (
          items.map((item, index) => {
            const active = selectedIndex !== -1 && index === selectedIndex
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
                  'flex w-full items-center gap-2 rounded-sm p-2 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
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
