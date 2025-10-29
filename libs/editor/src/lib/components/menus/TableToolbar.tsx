'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { Button } from '@nextblock-cms/ui/button';
import { Rows3, Rows2, Columns3, Columns2, Trash2 } from 'lucide-react';

interface TableToolbarProps {
  editor: Editor;
}

const isTableContext = (editor: Editor) =>
  editor.isActive('table') ||
  editor.isActive('tableCell') ||
  editor.isActive('tableHeader') ||
  editor.isActive('tableRow');

export const TableToolbar: React.FC<TableToolbarProps> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const { refs, x, y, strategy, update } = useFloating({
    placement: 'bottom',
    strategy: 'fixed',
    middleware: [offset(12), flip(), shift()],
    whileElementsMounted: autoUpdate,
    open,
    onOpenChange: setOpen,
  });

  const resolveCellElement = useCallback((): HTMLElement | null => {
    const { state, view } = editor;
    try {
      const { from } = state.selection;
      const { node } = view.domAtPos(from);
      let element: HTMLElement | null = null;

      if (node.nodeType === Node.ELEMENT_NODE) {
        element = node as HTMLElement;
      } else if (node.nodeType === Node.TEXT_NODE) {
        element = node.parentElement as HTMLElement | null;
      } else if ((node as any)?.parentElement) {
        element = (node as any).parentElement as HTMLElement | null;
      }

      return element?.closest?.('td, th') ?? null;
    } catch {
      return null;
    }
  }, [editor]);

  const resolveTableElement = useCallback((): HTMLTableElement | null => {
    const cell = resolveCellElement();
    return (cell?.closest('table') as HTMLTableElement | null) ?? null;
  }, [resolveCellElement]);

  const position = useCallback(() => {
    if (!isTableContext(editor)) {
      setOpen(false);
      return;
    }

    const tableEl = resolveTableElement();

    if (!tableEl) {
      setOpen(false);
      return;
    }

    refs.setReference(tableEl);
    setOpen(true);
    setReady(false);
    requestAnimationFrame(() => {
      update();
      requestAnimationFrame(() => setReady(true));
    });
  }, [editor, refs, resolveTableElement, update]);

  useEffect(() => {
    const handleChange = () => {
      if (isTableContext(editor)) {
        position();
      } else {
        setOpen(false);
      }
    };

    const handleBlur = () => setOpen(false);

    handleChange();
    editor.on('selectionUpdate', handleChange);
    editor.on('transaction', handleChange);
    editor.on('focus', handleChange);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', handleChange);
      editor.off('transaction', handleChange);
      editor.off('focus', handleChange);
      editor.off('blur', handleBlur);
    };
  }, [editor, position]);

  if (!open) {
    return null;
  }

  const can = editor.can();
  const canAddRow = typeof can.addRowAfter === 'function' ? can.addRowAfter() : false;
  const canDeleteRow = typeof can.deleteRow === 'function' ? can.deleteRow() : false;
  const canAddColumn = typeof can.addColumnAfter === 'function' ? can.addColumnAfter() : false;
  const canDeleteColumn = typeof can.deleteColumn === 'function' ? can.deleteColumn() : false;
  const canDeleteTable = typeof can.deleteTable === 'function' ? can.deleteTable() : false;

  const addRow = () => {
    editor.chain().focus().addRowAfter().run();
    position();
  };

  const deleteRow = () => {
    editor.chain().focus().deleteRow().run();
    position();
  };

  const addColumn = () => {
    editor.chain().focus().addColumnAfter().run();
    position();
  };

  const deleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
    position();
  };

  const deleteTable = () => {
    editor.chain().focus().deleteTable().run();
    setOpen(false);
  };

  return (
    <div
      ref={refs.setFloating}
      style={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        zIndex: 10002,
        visibility: ready ? 'visible' : 'hidden',
      }}
      className="flex items-center gap-1 rounded-full border bg-background/95 px-2 py-1 shadow-lg"
      onMouseDown={(event) => event.preventDefault()}
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={addRow}
        disabled={!canAddRow}
        title="Add row below"
        aria-label="Add row below"
      >
        <Rows3 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={deleteRow}
        disabled={!canDeleteRow}
        title="Delete current row"
        aria-label="Delete current row"
      >
        <Rows2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={addColumn}
        disabled={!canAddColumn}
        title="Add column to the right"
        aria-label="Add column to the right"
      >
        <Columns3 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={deleteColumn}
        disabled={!canDeleteColumn}
        title="Delete current column"
        aria-label="Delete current column"
      >
        <Columns2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={deleteTable}
        disabled={!canDeleteTable}
        title="Delete table"
        aria-label="Delete table"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default TableToolbar;
