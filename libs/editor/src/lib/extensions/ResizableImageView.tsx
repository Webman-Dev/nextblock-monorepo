'use client';

import * as React from 'react'
import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'

type ImgAttrs = {
  src: string
  alt?: string | null
  width?: number | string | null
  height?: number | string | null
  blurDataURL?: string | null
  align?: string | null
  focalX?: number | null
  focalY?: number | null
  focusMode?: boolean
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export default function ResizableImageView(props: NodeViewProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const [tempWidthPct, setTempWidthPct] = React.useState<number | null>(null)

  const attrs = props.node.attrs as ImgAttrs

  const widthPct = React.useMemo(() => {
    const w = attrs.width
    // Preserve fractional percentages; allow down to 1%
    if (typeof w === 'string' && w.trim().endsWith('%')) return clamp(parseFloat(w) || 100, 1, 100)
    if (typeof w === 'number') return 100
    return 100
  }, [attrs.width])

  const displayWidth = tempWidthPct ?? widthPct

  const startResize = (dir: 'east'|'west') => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = displayWidth
    const prose = (wrapperRef.current?.closest('.ProseMirror') as HTMLElement) || undefined
    const baseWidth = prose?.getBoundingClientRect().width || wrapperRef.current?.parentElement?.getBoundingClientRect().width || wrapperRef.current?.getBoundingClientRect().width || window.innerWidth

    // Track the latest value locally to avoid stale state on pointerup
    let latest = startWidth

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const deltaPct = (dx / baseWidth) * 100
      const raw = dir === 'east' ? (startWidth + deltaPct) : (startWidth - deltaPct)
      const next = clamp(raw, 1, 100)
      latest = next
      setTempWidthPct(next)
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      // Commit the last tracked value (avoid relying on possibly stale React state)
      const val = clamp(latest, 1, 100)
      props.updateAttributes({ width: `${val.toFixed(2)}%` })
      setTempWidthPct(null)
    }

    setDragging(true)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  const style: React.CSSProperties = (() => {
    const s: React.CSSProperties = { width: `${displayWidth}%`, maxWidth: '100%', display: 'block' }
    if (attrs.height) {
      if (typeof attrs.height === 'number') s.height = attrs.height
      else if (typeof attrs.height === 'string') s.height = attrs.height
    } else {
      s.height = 'auto'
    }
    // Alignment without floats to avoid breaking layout
    if (attrs.align === 'left') { (s as any).marginLeft = 0 as any; (s as any).marginRight = 'auto' }
    if (attrs.align === 'right') { (s as any).marginLeft = 'auto'; (s as any).marginRight = 0 as any }
    if (attrs.align === 'center') { s.margin = '0 auto' }
    return s
  })()

  const showHandles = props.selected || dragging

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className="tiptap-image-wrapper relative block"
      data-dragging={dragging ? 'true' : 'false'}
      contentEditable={false}
      style={style}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      <img
        src={attrs.src}
        alt={attrs.alt || ''}
        style={{
          display: 'block', width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: `${attrs.focalX ?? 50}% ${attrs.focalY ?? 50}%`,
          borderRadius: 6,
        }}
        draggable={false}
        onClick={(ev) => {
          if (attrs.focusMode) {
            const rect = (ev.target as HTMLElement).getBoundingClientRect()
            const x = Math.round(((ev.clientX - rect.left) / rect.width) * 100)
            const y = Math.round(((ev.clientY - rect.top) / rect.height) * 100)
            props.updateAttributes({ focalX: x, focalY: y, focusMode: false })
          }
        }}
      />

      {showHandles && (
        <>
          <div role="slider" aria-label="Resize image" aria-valuemin={1} aria-valuemax={100} aria-valuenow={displayWidth} onPointerDown={startResize('west')} className="absolute left-0 top-1/2 -translate-y-1/2 h-16 w-2 rounded-sm bg-primary cursor-ew-resize shadow border border-primary/40" />
          <div role="slider" aria-label="Resize image" aria-valuemin={1} aria-valuemax={100} aria-valuenow={displayWidth} onPointerDown={startResize('east')} className="absolute right-0 top-1/2 -translate-y-1/2 h-16 w-2 rounded-sm bg-primary cursor-ew-resize shadow border border-primary/40" />
        </>
      )}

      {showHandles && (
        <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary/60" />
      )}

      {dragging && (
        <div className="pointer-events-none absolute -top-6 right-0 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
          {Number(displayWidth.toFixed(1))}%
        </div>
      )}
    </NodeViewWrapper>
  )
}
