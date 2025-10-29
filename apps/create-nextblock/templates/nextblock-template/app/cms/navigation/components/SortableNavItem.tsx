// app/cms/navigation/components/SortableNavItem.tsx
"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableCell, TableRow } from "@nextblock-cms/ui";
import { Button } from '@nextblock-cms/ui';
import { Badge } from "@nextblock-cms/ui";
import { GripVertical, MoreHorizontal, Edit3 } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nextblock-cms/ui";
import DeleteNavItemButton from "./DeleteNavItemButton"; // Assuming this exists and works
import type { Database } from '@nextblock-cms/db'; // Ensure this path is correct

type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];

// Extended NavItem type for rendering
export interface HierarchicalNavItem extends NavigationItem {
  id: number; // Ensure id is number if it comes from DB as bigint
  children: HierarchicalNavItem[];
  parentLabel?: string | null;
  pageSlug?: string | null;
  languageCode: string; // Added for consistency if needed
  depth: number;
  parentItem?: HierarchicalNavItem | null; // Direct reference to the parent
}

interface SortableNavItemProps {
  item: HierarchicalNavItem;
  // Add any other props needed for actions, like onDelete, onEdit
}

export function SortableNavItem({ item }: SortableNavItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined, // Ensure transition is not null
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes} className={isDragging ? "bg-muted" : ""}>
      <TableCell style={{ paddingLeft: `${item.depth * 20 + 16}px` }} className="py-2"> {/* Indentation + original padding */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            {...listeners} // Drag handle
            className="cursor-grab mr-2 p-1"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
          <span className="font-medium">{item.label}</span>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate py-2" title={item.url}>
        {item.url}
      </TableCell>
      <TableCell className="py-2"><Badge variant="outline">{item.order}</Badge></TableCell>
      <TableCell className="text-xs text-muted-foreground py-2">{item.parentLabel || 'None'}</TableCell>
      <TableCell className="text-xs text-muted-foreground py-2">{item.pageSlug ? `/${item.pageSlug}` : 'Manual URL'}</TableCell>
      <TableCell className="text-right py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Item actions for {item.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/cms/navigation/${item.id}/edit`} className="flex items-center">
                <Edit3 className="mr-2 h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
            <DeleteNavItemButton itemId={item.id} />
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}