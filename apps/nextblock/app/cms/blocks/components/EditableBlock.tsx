// app/cms/blocks/components/EditableBlock.tsx
"use client";

import React, { useState, Suspense, useMemo, lazy, LazyExoticComponent, ComponentType } from 'react';
import type { Database } from "@nextblock-monorepo/db";
import PostsGridBlockEditor from '../editors/PostsGridBlockEditor';

type Block = Database['public']['Tables']['blocks']['Row'];
import { Button } from "@nextblock-monorepo/ui";
import { GripVertical, Edit2 } from "lucide-react";
import { getBlockDefinition, blockRegistry, BlockType } from "@/lib/blocks/blockRegistry";
import { BlockEditorModal } from './BlockEditorModal';
import { DeleteBlockButtonClient } from './DeleteBlockButtonClient';
import { cn } from '@nextblock-monorepo/utils';

export interface EditableBlockProps {
  block: Block;
  onDelete: (blockId: number) => void;
  onContentChange: (blockId: number, newContent: Record<string, any>) => void;
  dragHandleProps?: Record<string, any>;
  onEditNestedBlock?: (parentBlockId: string, columnIndex: number, blockIndexInColumn: number) => void;
  className?: string;
}

export default function EditableBlock({
  block,
  onDelete,
  onContentChange,
  dragHandleProps,
  onEditNestedBlock,
  className,
}: EditableBlockProps) {
  // Move all hooks to the top before any conditional returns
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [LazyEditor, setLazyEditor] = useState<LazyExoticComponent<ComponentType<any>> | null>(null);

  const SectionEditor = useMemo(() => {
    if (block?.block_type === 'section' || block?.block_type === 'hero') {
      const editorFilename = blockRegistry[block.block_type as BlockType]?.editorComponentFilename;
      if (editorFilename) {
        return lazy(() => import(`../editors/${editorFilename}`));
      }
    }
    return null;
  }, [block?.block_type]);

  // Add a guard for undefined block prop after hooks
  if (!block) {
    // Or some other placeholder/error display
    return <div className="p-4 border rounded-lg bg-card shadow text-red-500">Error: Block data is missing in EditableBlock.</div>;
  }



  const handleEditClick = () => {
    if (block.block_type === 'section' || block.block_type === 'hero') {
      setIsConfigPanelOpen(prev => !prev);
    } else {
      const editorFilename = blockRegistry[block.block_type as BlockType]?.editorComponentFilename;
      if (block.block_type === 'posts_grid') {
        const LazifiedPostsGridEditor = lazy(() => Promise.resolve({ default: PostsGridBlockEditor }));
        setLazyEditor(LazifiedPostsGridEditor);
        setEditingBlock(block);
      }
      else if (editorFilename) {
        const Editor = lazy(() => import(`../editors/${editorFilename}`));
        setLazyEditor(Editor);
        setEditingBlock(block);
      }
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the element that was clicked, or any of its parents up to the card, is a button,
    // then we should ignore the click on the card. This lets the button's own onClick handle the event.
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // If the click was on the card's background (not a button), and it's an editable block type,
    // then trigger the edit handler.
    if (block.block_type !== 'section' && block.block_type !== 'hero') {
      handleEditClick();
    }
  };

  const renderPreview = () => {
    // Safe access to block_type for preview
    const currentBlockType = block && block.block_type;
    if (!currentBlockType) {
      return <div className="text-red-500">Error: Block type missing for preview.</div>;
    }

    const blockDefinition = getBlockDefinition(currentBlockType as BlockType);
    const blockLabel = blockDefinition?.label || currentBlockType;

    // Default preview for other block types
    return (
      <div
        className="py-4 flex flex-col items-center justify-center space-y-2 min-h-[80px] border border-dashed rounded-md bg-muted/20 cursor-pointer hover:border-primary"
        onClick={handleCardClick}
      >
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{blockLabel}</p>
          <p className="text-xs text-muted-foreground">Click edit to modify content</p>
        </div>
        {/* This button is for non-section blocks which are not yet implemented for inline editing */}
        <Button variant="outline" size="sm" onClick={(e) => {
          e.stopPropagation();
          handleEditClick();
        }}>
          Edit Block
        </Button>
      </div>
    );
  };

  const isSection = block?.block_type === 'section' || block?.block_type === 'hero';
  const blockDefinition = getBlockDefinition(block.block_type as BlockType);

  return (
    <div
      className={cn(
        "p-4 border rounded-lg bg-card shadow",
        className
      )}
    >
      <div className="flex justify-between items-center mb-2 pb-2 border-b">
        <div className="flex items-center gap-2">
          <button {...dragHandleProps} className="p-1 rounded-md hover:bg-muted cursor-grab" aria-label="Drag to reorder">
            <GripVertical className="h-5 w-5" />
          </button>
          <h3 className="font-semibold">{blockDefinition?.label || block.block_type}</h3>
        </div>
        <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick();
              }}
              aria-label={isSection ? "Toggle Section Config" : "Edit block"}
            >
              <Edit2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          <DeleteBlockButtonClient
            blockId={block.id}
            blockTitle={blockDefinition?.label || block.block_type}
            onDelete={() => onDelete(block.id)}
          />
        </div>
      </div>
      {isSection ? (
        <div className="mt-2 min-h-[200px]">
          <Suspense fallback={<div className="flex justify-center items-center h-full"><p>Loading Editor...</p></div>}>
            {SectionEditor && <SectionEditor block={block} content={block.content || {}} onChange={(newContent: Record<string, any>) => onContentChange(block.id, newContent)} blockType={block.block_type as 'section' | 'hero'} isConfigPanelOpen={isConfigPanelOpen} />}
          </Suspense>
        </div>
      ) : renderPreview()}

      {editingBlock && LazyEditor && (
        <BlockEditorModal
          isOpen={!!editingBlock}
          block={{...editingBlock, type: editingBlock.block_type as BlockType}}
          EditorComponent={LazyEditor}
          onClose={() => {
            setEditingBlock(null);
            setLazyEditor(null);
          }}
          onSave={(newContent: any) => {
            onContentChange(block.id, newContent);
            setEditingBlock(null);
            setLazyEditor(null);
          }}
        />
      )}
    </div>
  );
}
