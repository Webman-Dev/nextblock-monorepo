// app/cms/blocks/editors/SectionBlockEditor.tsx
"use client";

import React, { useState, useMemo } from "react";
import ColumnEditor from "../components/ColumnEditor";
import type { SectionBlockContent } from "@/lib/blocks/blockRegistry";
import {
  getBlockDefinition,
} from "@/lib/blocks/blockRegistry";
import SectionConfigPanel from "../components/SectionConfigPanel";



// DND Kit imports for column block reordering
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface SectionBlockEditorProps {
  content: Partial<SectionBlockContent>;
  onChange: (newContent: SectionBlockContent) => void;
  isConfigPanelOpen: boolean;
  blockType: 'section' | 'hero';
}

// Background style generator (Mirrors SectionBlockRenderer logic)
function generateBackgroundStyles(background: SectionBlockContent['background']) {
  const styles: React.CSSProperties = {};
  let className = '';
  const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

  switch (background?.type) {
    case 'theme': {
      // Theme-based backgrounds using CSS classes
      const themeClasses: Record<string, string> = {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        muted: 'bg-muted text-muted-foreground',
        accent: 'bg-accent text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground'
      };
      className = background.theme ? themeClasses[background.theme] || '' : '';
      break;
    }
    
    case 'solid':
      if (background.solid_color) {
          styles.backgroundColor = background.solid_color;
      }
      break;
    
    case 'gradient':
      if (background.gradient) {
        const { type, direction, stops } = background.gradient;
        const gradientStops = stops.map(stop => `${stop.color} ${stop.position}%`).join(', ');
        styles.background = `${type}-gradient(${direction || 'to right'}, ${gradientStops})`;
      }
      break;
    
    case 'image':
      if (background.image) {
        const imageUrl = `${R2_BASE_URL}/${background.image.object_key}`;
        styles.backgroundSize = background.image.size || 'cover';
        styles.backgroundPosition = background.image.position || 'center';

        let finalBackgroundImage = `url(${imageUrl})`;

        if (background.image.overlay && background.image.overlay.gradient) {
          const { type, direction, stops } = background.image.overlay.gradient;
          const gradientStops = stops.map(stop => `${stop.color} ${stop.position}%`).join(', ');
          const gradient = `${type}-gradient(${direction || 'to right'}, ${gradientStops})`;
          finalBackgroundImage = `${gradient}, ${finalBackgroundImage}`;
        }
        
        styles.backgroundImage = finalBackgroundImage;
      }
      break;
    
    default:
      // No background
      break;
  }

  return { styles, className };
}

export default function SectionBlockEditor({
  content,
  onChange,
  isConfigPanelOpen,
  blockType,
}: SectionBlockEditorProps) {

  const processedContent = useMemo((): SectionBlockContent => {
    const defaults: SectionBlockContent = {
      container_type: "container",
      background: { type: "none" },
      responsive_columns: { mobile: 1, tablet: 2, desktop: 3 },
      column_gap: "md",
      padding: { top: "md", bottom: "md" },
      vertical_alignment: "start",
      column_blocks: [],
    };

    return {
      container_type: content.container_type ?? defaults.container_type,
      background: content.background ?? defaults.background,
      responsive_columns:
        content.responsive_columns ?? defaults.responsive_columns,
      column_gap: content.column_gap ?? defaults.column_gap,
      padding: content.padding ?? defaults.padding,
      vertical_alignment: content.vertical_alignment ?? defaults.vertical_alignment,
      column_blocks: content.column_blocks ?? defaults.column_blocks,
    };
  }, [content]);


  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<any>(null);

  // Generate background styles
  const { styles: backgroundStyles, className: backgroundClassName } = generateBackgroundStyles(processedContent.background);
  
  // DND sensors for cross-column dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleColumnBlocksChange = (
    columnIndex: number,
    newBlocks: SectionBlockContent["column_blocks"][0]
  ) => {
    const newColumns = [...(processedContent.column_blocks || [])];
    newColumns[columnIndex] = newBlocks;
    onChange({ ...processedContent, column_blocks: newColumns });
  };

  // Get blocks for a specific column from the 2D array
  const getColumnBlocks = (columnIndex: number) => {
    // With 2D array structure, directly return the column's blocks
    return (processedContent.column_blocks || [])[columnIndex] || [];
  };

  // Parse drag item ID to get column and block indices
  const parseDragId = (id: string) => {
    if (!id) return null;
    const blockMatch = id.match(/^(hero|section)-column-(\d+)-block-(\d+)$/);
    if (blockMatch) {
      return {
        type: "block",
        blockType: blockMatch[1],
        columnIndex: parseInt(blockMatch[2], 10),
        blockIndex: parseInt(blockMatch[3], 10),
      };
    }
    const droppableMatch = id.match(/^(hero|section)-column-droppable-(\d+)$/);
    if (droppableMatch) {
      return {
        type: "column",
        blockType: droppableMatch[1],
        columnIndex: parseInt(droppableMatch[2], 10),
      };
    }
    return null;
  };

  // Handle drag start - store the dragged block for overlay
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id.toString());

    const parsed = parseDragId(active.id.toString());
    if (
      parsed &&
      parsed.type === "block" &&
      parsed.columnIndex !== undefined &&
      parsed.blockIndex !== undefined
    ) {
      const block = (processedContent.column_blocks || [])[parsed.columnIndex]?.[
        parsed.blockIndex
      ];
      setDraggedBlock(block);
    }
  };

  // Handle drag end - move blocks between columns
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedBlock(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeData = parseDragId(active.id.toString());
    const overData = parseDragId(over.id.toString());

    if (!activeData) {
      return;
    }

    const newColumnBlocks = [...(processedContent.column_blocks || [])];
    const sourceColumnIndex = activeData.columnIndex;
    const sourceBlockIndex = activeData.blockIndex;

    // Guard against invalid source data
    if (sourceColumnIndex === undefined || sourceBlockIndex === undefined)
      return;

    const sourceColumn = newColumnBlocks[sourceColumnIndex];
    if (!sourceColumn) return;

    // Remove the block from the source column
    const [movedBlock] = sourceColumn.splice(sourceBlockIndex, 1);
    if (!movedBlock) return;

    // Determine the target and insert the block
    if (overData?.type === "block") {
      // Scenario 1: Dropped onto another block
      const targetColumnIndex = overData.columnIndex;
      const targetBlockIndex = overData.blockIndex;
      if (
        newColumnBlocks[targetColumnIndex] &&
        targetBlockIndex !== undefined
      ) {
        newColumnBlocks[targetColumnIndex].splice(
          targetBlockIndex,
          0,
          movedBlock
        );
      }
    } else if (overData?.type === "column") {
      // Scenario 2: Dropped on an empty column's droppable area
      const targetColumnIndex = overData.columnIndex;
      if (newColumnBlocks[targetColumnIndex]) {
        newColumnBlocks[targetColumnIndex].push(movedBlock);
      }
    } else {
      // Scenario 3: Invalid drop, return block to original position
      sourceColumn.splice(sourceBlockIndex, 0, movedBlock);
      return; // Exit without calling onChange
    }

    // Final state update
    onChange({
      ...processedContent,
      column_blocks: newColumnBlocks,
    });
  };

  // Custom drop animation for better visual feedback
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6 p-4 border-t mt-2">
        {isConfigPanelOpen && (
          <SectionConfigPanel
            content={processedContent}
            onChange={(newPartialContent) => {
              onChange({ ...processedContent, ...newPartialContent });
            }}
          />
        )}

        {/* Column Content Management */}
          <SortableContext
            items={(processedContent.column_blocks || [])
              .flatMap((columnBlocks, columnIndex) =>
                columnBlocks.map(
                  (_, blockIndex) =>
                    `${blockType}-column-${columnIndex}-block-${blockIndex}`
                )
              )
              .concat(
                Array.from(
                  { length: (processedContent.column_blocks || []).length },
                  (_, i) => `${blockType}-column-droppable-${i}`
                )
              )}
            strategy={verticalListSortingStrategy}
          >
            <div
              className={`grid gap-4 rounded-lg border transition-colors ${backgroundClassName} ${
                 (processedContent.column_blocks || []).length === 1
                   ? "grid-cols-1"
                   : `grid-cols-${processedContent.responsive_columns.mobile} md:grid-cols-${processedContent.responsive_columns.tablet} lg:grid-cols-${processedContent.responsive_columns.desktop}`
              }`}
              style={{
                ...backgroundStyles,
                minHeight: '200px'
              }}
            >
              {Array.from({ length: (processedContent.column_blocks || []).length }, (_, columnIndex) => (
                <ColumnEditor
                  key={`${blockType}-column-${columnIndex}`}
                  columnIndex={columnIndex}
                  blocks={getColumnBlocks(columnIndex)}
                  onBlocksChange={(newBlocks) =>
                    handleColumnBlocksChange(columnIndex, newBlocks)
                  }
                  blockType={blockType}
                  sectionBackground={processedContent.background}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag overlay for visual feedback during cross-column dragging */}
          <DragOverlay dropAnimation={dropAnimation}>
            {activeId && draggedBlock ? (
              <div className="p-2 border border-blue-300 dark:border-blue-600 rounded bg-blue-50 dark:bg-blue-900/50 shadow-lg opacity-90">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 capitalize">
                    {getBlockDefinition(draggedBlock.block_type)?.label ||
                      draggedBlock.block_type}
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {draggedBlock.block_type === "text" && (
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          (
                            draggedBlock.content.html_content || "Empty text"
                          ).substring(0, 30) + "...",
                      }}
                    />
                  )}
                  {draggedBlock.block_type === "heading" && (
                    <div>
                      H{draggedBlock.content.level || 1}:{" "}
                      {(
                        draggedBlock.content.text_content || "Empty heading"
                      ).substring(0, 20) + "..."}
                    </div>
                  )}
                  {draggedBlock.block_type === "image" && (
                    <div>
                      Image: {draggedBlock.content.alt_text || "No alt text"}
                    </div>
                  )}
                  {draggedBlock.block_type === "button" && (
                    <div>Button: {draggedBlock.content.text || "No text"}</div>
                  )}
                  {draggedBlock.block_type === "video_embed" && (
                    <div>Video: {draggedBlock.content.title || "No title"}</div>
                  )}
                  {draggedBlock.block_type === "posts_grid" && (
                    <div>
                      Posts Grid: {draggedBlock.content.columns || 3} cols
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>
      </div>
    </DndContext>
  );
}
