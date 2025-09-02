'use client';

import React, { useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { GripVertical } from 'lucide-react';
import { cn } from '@nextblock-monorepo/utils';

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
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // The DragHandle extension from the kit will automatically render drag handles
  // This component is mainly for styling and event handling
  useEffect(() => {
    if (!editor || !dragHandleRef.current) return;

    const handleDragStart = (event: DragEvent) => {
      console.log('DragHandle - Drag start event:', event);
      onDragStart?.(event);
    };

    const handleDragEnd = (event: DragEvent) => {
      console.log('DragHandle - Drag end event:', event);
      onDragEnd?.(event);
    };

    const element = dragHandleRef.current;
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragend', handleDragEnd);

    return () => {
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('dragend', handleDragEnd);
    };
  }, [editor, onDragStart, onDragEnd]);

  if (!editor) {
    console.log('DragHandle - No editor provided');
    return null;
  }

  console.log('DragHandle - Rendering with editor:', {
    editorExists: !!editor,
    editorExtensions: editor.extensionManager?.extensions?.map(ext => ext.name) || 'no extensions',
    hasDragHandleExtension: editor.extensionManager?.extensions?.some(ext => ext.name === 'dragHandle') || false
  });

  // Enhanced drag handle with improved visibility and accessibility
  return (
    <div
      ref={dragHandleRef}
      className={cn(
        'drag-handle-button',
        'flex items-center justify-center',
        'w-7 h-7 rounded-md border-2',
        'text-slate-500 hover:text-slate-700',
        'border-slate-200/50 hover:border-slate-300',
        'bg-slate-50/50 hover:bg-slate-100/80',
        'active:bg-slate-200/80 active:border-slate-400',
        'cursor-grab active:cursor-grabbing',
        'transition-all duration-200 ease-in-out',
        'opacity-0 group-hover:opacity-100',
        'hover:scale-105 active:scale-95',
        'hover:shadow-sm active:shadow-none',
        'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        'dark:text-slate-400 dark:hover:text-slate-200',
        'dark:border-slate-700/50 dark:hover:border-slate-600',
        'dark:bg-slate-800/50 dark:hover:bg-slate-700/80',
        'dark:active:bg-slate-600/80 dark:active:border-slate-500',
        className
      )}
      role="button"
      tabIndex={0}
      aria-label="Drag to reorder this block"
      title="Hold and drag to reorder this block"
      draggable
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );
};

export default DragHandle;