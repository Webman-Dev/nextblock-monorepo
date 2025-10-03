'use client';

import React, { useCallback, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { NodeSelection } from 'prosemirror-state'
import { useFloating, offset, autoUpdate } from '@floating-ui/react'
import { Button } from '@nextblock-cms/ui/button'
import { AlignLeft, AlignCenter, AlignRight, Download, Trash2 } from 'lucide-react'

interface ImageToolbarProps { editor: Editor }

export const ImageToolbar: React.FC<ImageToolbarProps> = ({ editor }) => {
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)

  const { x, y, refs, strategy, update } = useFloating({
    placement: 'top',
    strategy: 'fixed',
    open,
    onOpenChange: setOpen,
    // Render inside the image (slightly down from top edge) and keep centered
    middleware: [offset(-12)],
    whileElementsMounted: autoUpdate,
  })

  const isImageActive = useCallback(() => editor.isActive('image'), [editor])

  const attrs = (editor.getAttributes('image') || {}) as Record<string, any>

  const position = useCallback(() => {
    const { state, view } = editor

    const findSelectedImageEl = (): HTMLElement | null => {
      try {
        // Prefer NodeSelection DOM
        if (state.selection instanceof NodeSelection) {
          const dom = view.nodeDOM(state.selection.from) as HTMLElement | null
          if (dom) {
            const wrapper = (dom.closest?.('.tiptap-image-wrapper') as HTMLElement | null) ?? dom
            const img = (wrapper.querySelector('img') as HTMLElement | null) ?? wrapper
            return img
          }
        }
        // Fallback: query selected node inside editor
        const inView = view.dom.querySelector('.tiptap-image-wrapper.ProseMirror-selectednode') as HTMLElement | null
        if (inView) return (inView.querySelector('img') as HTMLElement | null) ?? inView
        // Fallback: any selected node (then climb to wrapper)
        const anySel = view.dom.querySelector('.ProseMirror-selectednode') as HTMLElement | null
        if (anySel) {
          const wrapper = (anySel.closest?.('.tiptap-image-wrapper') as HTMLElement | null) ?? anySel
          return (wrapper.querySelector('img') as HTMLElement | null) ?? wrapper
        }
      } catch {
        // Ignore DOM probing errors
        void 0
      }
      return null
    }

    const lastRef = (position as any)._lastEl as HTMLElement | null
    const el = findSelectedImageEl() ?? lastRef
    if (el) {
      ;(position as any)._lastEl = el
      // Use a virtual element that always reads the latest image rect
      const virtualRef = {
        getBoundingClientRect: () => {
          const live = findSelectedImageEl() ?? (position as any)._lastEl
          return live ? live.getBoundingClientRect() : new DOMRect(0, 0, 0, 0)
        },
      } as any
      refs.setReference(virtualRef)
    } else {
      // Last resort: caret position
      const rect = view.coordsAtPos(state.selection.from)
      const virtualEl = { getBoundingClientRect: () => new DOMRect(rect.left, rect.top, 0, 0) } as any
      refs.setReference(virtualEl)
    }

    // Ensure layout has settled before reading positions
    requestAnimationFrame(() => {
      update()
      requestAnimationFrame(() => setReady(true))
    })
  }, [editor, refs, update])

  useEffect(() => {
    const handle = () => {
      const active = isImageActive()
      setOpen(active)
      setReady(false)
      if (active) position()
    }
    handle()
    editor.on('selectionUpdate', handle)
    editor.on('transaction', handle)
    editor.on('focus', handle)
    editor.on('blur', () => setOpen(false))
    return () => {
      editor.off('selectionUpdate', handle)
      editor.off('transaction', handle)
      editor.off('focus', handle)
    }
  }, [editor, isImageActive, position])

  if (!open) return null

  const setAlign = (align: 'left'|'center'|'right'|null) => {
    editor.chain().focus().updateAttributes('image', { align }).run()
    // Schedule a reposition after layout settles
    requestAnimationFrame(() => position())
  }
  // Removed unused setWidthPct to satisfy no-unused-vars
  const handleDelete = () => {
    editor.chain().focus().deleteSelection().run()
  }
  const handleDownload = () => {
    const src: string | undefined = attrs?.src
    if (!src) return
    try {
      const a = document.createElement('a')
      a.href = src
      const name = (src.split('?')[0] || '').split('/').pop() || 'image'
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      // Ignore download failures
      void 0
    }
  }

  return (
    <div
      ref={refs.setFloating}
      style={{ position: strategy, top: y ?? 0, left: x ?? 0, zIndex: 10002, visibility: ready ? 'visible' : 'hidden', pointerEvents: 'auto' }}
      className="bg-background/95 backdrop-blur border rounded-full shadow-lg px-3 py-2 flex items-center gap-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      

      <Button size="icon" variant={attrs.align === 'left' ? 'default' : 'ghost'} title="Align left" onClick={() => setAlign('left')}>
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button size="icon" variant={attrs.align === 'center' ? 'default' : 'ghost'} title="Align center" onClick={() => setAlign('center')}>
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button size="icon" variant={attrs.align === 'right' ? 'default' : 'ghost'} title="Align right" onClick={() => setAlign('right')}>
        <AlignRight className="h-4 w-4" />
      </Button>

      <Button size="icon" variant="ghost" title="Download" onClick={handleDownload}>
        <Download className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" title="Delete" onClick={handleDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default ImageToolbar
