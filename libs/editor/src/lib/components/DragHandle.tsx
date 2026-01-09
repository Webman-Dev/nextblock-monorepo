'use client';

import React, { useMemo, useRef } from 'react';
import DragHandleReact from '@tiptap/extension-drag-handle-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@nextblock-cms/utils';

interface DragHandleProps {
  editor: Editor | null;
  className?: string;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
  onNodeChange?: (params: { node: any; editor: Editor; pos: number }) => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({
  editor,
  className,
  onDragStart,
  onDragEnd,
  onNodeChange,
}) => {
  const groupRef = useRef<HTMLDivElement>(null);

  const handlePlusClick = useMemo(
    () => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const container = groupRef.current;
      if (!container) return;

      const toggleEvent = new CustomEvent('tiptap-gutter-toggle', {
        bubbles: true,
        detail: {
          handle: container,
          button: event.currentTarget,
        },
      });

      container.dispatchEvent(toggleEvent);
    },
    []
  );

  const handlePlusKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePlusClick(event as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <DragHandleReact
      editor={editor}
      className={cn('tiptap-drag-handle', className)}
      onElementDragStart={onDragStart}
      onElementDragEnd={onDragEnd}
      onNodeChange={params => onNodeChange?.(params)}
    >
      <div
        ref={groupRef}
        className="tiptap-drag-handle__group"
        role="group"
        data-orientation="horizontal"
      >
        <button
          type="button"
          aria-label="Insert block"
          title="Insert block"
          className="tiptap-drag-handle__button tiptap-drag-handle__button--ghost tiptap-drag-handle__plus"
          onClick={handlePlusClick}
          onKeyDown={handlePlusKeyDown}
        >
          <PlusFilled />
        </button>

        <button
          type="button"
          className="tiptap-drag-handle__button tiptap-drag-handle__button--ghost tiptap-drag-handle__grip"
          role="button"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          tabIndex={0}
        >
          <GripDotsFilled />
        </button>
      </div>
    </DragHandleReact>
  );
};

export default DragHandle;

const PlusFilled: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn('tiptap-drag-handle__icon tiptap-drag-handle__icon--filled', className)}
    {...rest}
  >
    <path d="M13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5Z" />
  </svg>
);

const GripDotsFilled: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn('tiptap-drag-handle__icon tiptap-drag-handle__icon--filled', className)}
    {...rest}
  >
    <path d="M9 3C7.89543 3 7 3.89543 7 5C7 6.10457 7.89543 7 9 7C10.1046 7 11 6.10457 11 5C11 3.89543 10.1046 3 9 3Z" />
    <path d="M9 10C7.89543 10 7 10.8954 7 12C7 13.1046 7.89543 14 9 14C10.1046 14 11 13.1046 11 12C11 10.8954 10.1046 10 9 10Z" />
    <path d="M7 19C7 17.8954 7.89543 17 9 17C10.1046 17 11 17.8954 11 19C11 20.1046 10.1046 21 9 21C7.89543 21 7 20.1046 7 19Z" />
    <path d="M15 10C13.8954 10 13 10.8954 13 12C13 13.1046 13.8954 14 15 14C16.1046 14 17 13.1046 17 12C17 10.8954 16.1046 10 15 10Z" />
    <path d="M13 5C13 3.89543 13.8954 3 15 3C16.1046 3 17 3.89543 17 5C17 6.10457 16.1046 7 15 7C13.8954 7 13 6.10457 13 5Z" />
    <path d="M15 17C13.8954 17 13 17.8954 13 19C13 20.1046 13.8954 21 15 21C16.1046 21 17 20.1046 17 19C17 17.8954 16.1046 17 15 17Z" />
  </svg>
);
