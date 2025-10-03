'use client';

import React, { useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@nextblock-cms/ui/button';
import { cn } from '@nextblock-cms/utils';
import { useEditorHistory, getHistoryShortcut } from '../../hooks/useEditorHistory';

interface UndoRedoButtonsProps {
  editor: Editor;
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UndoRedoButtons: React.FC<UndoRedoButtonsProps> = ({
  editor,
  className,
  showLabels = false,
  size = 'sm',
}) => {
  // Use the enhanced history hook
  const { canUndo, canRedo, undo, redo } = useEditorHistory(editor);

  // Keyboard shortcuts - only add if editor is focused
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if the editor is focused
      if (!editor.isFocused) return;
      
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          undo();
        } else if (
          (event.key === 'z' && event.shiftKey) ||
          event.key === 'y'
        ) {
          event.preventDefault();
          redo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, undo, redo]);

  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Undo Button - Enhanced visibility */}
      <Button
        variant={canUndo ? "outline" : "ghost"}
        size={buttonSize}
        onClick={undo}
        disabled={!canUndo}
        title={`Undo last action (${getHistoryShortcut('undo')})`}
        aria-label="Undo last action"
        className={cn(
          'transition-all duration-200 border-2',
          size === 'sm' ? 'h-8 w-8 p-0' : size === 'lg' ? 'h-10 w-10 p-0' : 'h-9 w-9 p-0',
          !canUndo
            ? 'opacity-40 cursor-not-allowed border-transparent'
            : 'border-primary/20 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95 shadow-sm',
          canUndo && 'bg-primary/5',
          showLabels && 'w-auto px-3'
        )}
      >
        <Undo2 className={cn(
          iconSize,
          'transition-colors duration-200',
          !canUndo ? 'text-muted-foreground' : canUndo ? 'text-primary' : 'text-current'
        )} />
        {showLabels && <span className="ml-2">Undo</span>}
      </Button>

      {/* Redo Button - Enhanced visibility */}
      <Button
        variant={canRedo ? "outline" : "ghost"}
        size={buttonSize}
        onClick={redo}
        disabled={!canRedo}
        title={`Redo last undone action (${getHistoryShortcut('redo')})`}
        aria-label="Redo last undone action"
        className={cn(
          'transition-all duration-200 border-2',
          size === 'sm' ? 'h-8 w-8 p-0' : size === 'lg' ? 'h-10 w-10 p-0' : 'h-9 w-9 p-0',
          !canRedo
            ? 'opacity-40 cursor-not-allowed border-transparent'
            : 'border-primary/20 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95 shadow-sm',
          canRedo && 'bg-primary/5',
          showLabels && 'w-auto px-3'
        )}
      >
        <Redo2 className={cn(
          iconSize,
          'transition-colors duration-200',
          !canRedo ? 'text-muted-foreground' : canRedo ? 'text-primary' : 'text-current'
        )} />
        {showLabels && <span className="ml-2">Redo</span>}
      </Button>
    </div>
  );
};

export default UndoRedoButtons;