// app/cms/blocks/components/SortableBlockItem.tsx
"use client";

import React from 'react';
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import EditableBlock, { EditableBlockProps } from "./EditableBlock"; // Import the actual component and its props

// interface SortableBlockItemProps extends EditableBlockProps {
//   // No new props needed specifically for SortableBlockItem itself,
//   // as it passes through all props to EditableBlock
// }

export function SortableBlockItem(props: EditableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto', // Ensure dragging item is on top
    opacity: isDragging ? 0.8 : 1,
  };

  // Pass the drag handle props (attributes and listeners) to the EditableBlock
  // The EditableBlock component should then spread these onto its drag handle element.
  // If EditableBlock doesn't have a specific handle, spread them on its root.
  return (
    <div ref={setNodeRef} style={style}>
      {/*
        Pass attributes and listeners to the element you want to be the drag handle.
        If the whole block is draggable, pass it to the root of EditableBlock.
        If there's a specific handle icon, pass it to that.
        Here, we pass it as a prop, assuming EditableBlock will use it.
      */}
      <EditableBlock {...props} dragHandleProps={{...attributes, ...listeners}} />
    </div>
  );
}