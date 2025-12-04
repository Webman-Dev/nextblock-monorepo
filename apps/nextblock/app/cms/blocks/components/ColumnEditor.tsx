// app/cms/blocks/components/ColumnEditor.tsx
"use client";

import React, { useState, lazy } from 'react';
import { cn } from '@nextblock-cms/utils';
import { Button } from '@nextblock-cms/ui';
import { PlusCircle, Trash2, Edit2, GripVertical } from "lucide-react";
import type { SectionBlockContent } from '@/lib/blocks/blockRegistry';
import { availableBlockTypes, getBlockDefinition, getInitialContent, BlockType } from '@/lib/blocks/blockRegistry';
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockEditorModal } from './BlockEditorModal';
import { ConfirmationDialog } from '@nextblock-cms/ui';
import BlockTypeSelector from './BlockTypeSelector';


type ColumnBlock = SectionBlockContent['column_blocks'][0][0];

// Sortable block item component for column blocks
interface SortableColumnBlockProps {
  block: ColumnBlock;
  index: number;
  columnIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  blockType: 'section' | 'hero';
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function SortableColumnBlock({ block, index, columnIndex, onEdit, onDelete, blockType, onClick }: SortableColumnBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${blockType}-column-${columnIndex}-block-${index}`,
    data: {
      type: 'block',
      blockType,
      columnIndex,
      blockIndex: index,
      block
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockDefinition = getBlockDefinition(block.block_type);
  const blockLabel = blockDefinition?.label || block.block_type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
     {...attributes}
     {...listeners}
     className={cn(
       "group relative p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 shadow-sm",
       "cursor-pointer hover:border-primary"
     )}
   >
     <div className="flex items-center justify-between mb-1">
       <div className="flex items-center gap-2">
         <GripVertical className="h-3 w-3 text-gray-400" />
         <span className="text-xs font-medium text-gray-600 dark:text-gray-300 capitalize">
           {blockLabel}
         </span>
       </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-6 w-6 p-0" title="Edit block">
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-red-600 hover:text-red-700" title="Delete block">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {block.block_type === 'text' && (
          <div dangerouslySetInnerHTML={{ __html: (block.content.html_content || 'Empty text').substring(0, 50) + (block.content.html_content && block.content.html_content.length > 50 ? '...' : '') }} />
        )}
        {block.block_type === 'heading' && (
          <div>H{block.content.level || 1}: {(block.content.text_content || 'Empty heading').substring(0, 30) + (block.content.text_content && block.content.text_content.length > 30 ? '...' : '')}</div>
        )}
        {block.block_type === 'image' && (
          <div>Image: {block.content.alt_text || block.content.media_id ? 'Image selected' : 'No image selected'}</div>
        )}
        {block.block_type === 'button' && (
          <div>Button: {block.content.text || 'No text'} → {block.content.url || '#'}</div>
        )}
        {block.block_type === 'video_embed' && (
          <div>Video: {block.content.title || block.content.url || 'No URL set'}</div>
        )}
        {block.block_type === 'posts_grid' && (
          <div>Posts Grid: {block.content.columns || 3} cols, {block.content.postsPerPage || 12} posts</div>
        )}
      </div>
    </div>
  );
}

// Column editor component
export interface ColumnEditorProps {
  columnIndex: number;
  blocks: ColumnBlock[];
  onBlocksChange: (newBlocks: ColumnBlock[]) => void;
  blockType: 'section' | 'hero';
}

type EditingBlock = ColumnBlock & { index: number };

export default function ColumnEditor({ columnIndex, blocks, onBlocksChange, blockType }: ColumnEditorProps) {
  const [editingBlock, setEditingBlock] = useState<EditingBlock | null>(null);
  const [isBlockSelectorOpen, setIsBlockSelectorOpen] = useState(false);
  const [LazyEditor, setLazyEditor] = useState<React.LazyExoticComponent<React.ComponentType<any>> | React.ComponentType<any> | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [blockToDeleteIndex, setBlockToDeleteIndex] = useState<number | null>(null);

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `${blockType}-column-droppable-${columnIndex}`,
  });

  const handleAddBlock = (selectedBlockType: BlockType) => {
    if (!selectedBlockType) return;
    const initialContent = getInitialContent(selectedBlockType);
    const newBlock: ColumnBlock = {
      block_type: selectedBlockType,
      content: initialContent || {},
      temp_id: `temp-${Date.now()}-${Math.random()}`
    };
    onBlocksChange([...blocks, newBlock]);
  };

  const handleSelectBlockType = (selectedBlockType: BlockType) => {
    handleAddBlock(selectedBlockType);
    setIsBlockSelectorOpen(false);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, block: ColumnBlock, index: number) => {
    // Ignore clicks on buttons to prevent conflicts with drag/delete/edit icons.
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    // Call the existing function to open the modal for this block.
    handleStartEdit(block, index);
  };

  const handleDeleteBlock = (index: number) => {
    setBlockToDeleteIndex(index);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (blockToDeleteIndex === null) return;
    const newBlocks = blocks.filter((_, i) => i !== blockToDeleteIndex);
    onBlocksChange(newBlocks);
    setIsConfirmOpen(false);
    setBlockToDeleteIndex(null);
  };

  const handleStartEdit = (block: ColumnBlock, index: number) => {
    const blockDef = getBlockDefinition(block.block_type);
    if (!blockDef) {
      console.error(`No definition found for block type: ${block.block_type}`);
      return;
    }

    if (blockDef.EditorComponent) {
      const Component = blockDef.EditorComponent;
      setLazyEditor(() => Component);
      setEditingBlock({ ...block, index });
    } else if (blockDef.editorComponentFilename) {
      const filename = blockDef.editorComponentFilename;
      const Editor = lazy(() => import(`../editors/${filename.replace(/\.tsx$/, '')}`));
      setLazyEditor(Editor);
      setEditingBlock({ ...block, index });
    } else {
      console.error(`No editor component found for block type: ${block.block_type}`);
    }
  };

  const handleSave = (newContent: any) => {
    if (editingBlock === null) return;

    const updatedBlocks = [...blocks];
    updatedBlocks[editingBlock.index] = {
      ...updatedBlocks[editingBlock.index],
      content: newContent,
    };
    onBlocksChange(updatedBlocks);
    setEditingBlock(null);
    setLazyEditor(null);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Column {columnIndex + 1}
            </h4>
            <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="mt-2">
          <Button onClick={() => setIsBlockSelectorOpen(true)} size="sm" className="w-full h-8">
            <PlusCircle className="h-3 w-3 mr-2" />
            Add Block
          </Button>
        </div>
      </div>
      <div className="p-3 flex-grow">
        {blocks.length === 0 ? (
          <div
            ref={setDroppableNodeRef}
            className={`h-full flex items-center justify-center text-xs text-gray-500 border-2 border-dashed rounded-lg transition-colors ${
              isOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            Drag block here
          </div>
        ) : (
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <div key={`${blockType}-column-${columnIndex}-block-${index}`}>
                <SortableColumnBlock
                  block={block}
                  index={index}
                  columnIndex={columnIndex}
                  blockType={blockType}
                  onEdit={() => handleStartEdit(block, index)}
                  onDelete={() => handleDeleteBlock(index)}
                  onClick={(e) => handleCardClick(e, block, index)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {editingBlock && LazyEditor && (
        <BlockEditorModal
          isOpen={!!editingBlock}
          onClose={() => {
            setEditingBlock(null);
            setLazyEditor(null);
          }}
          onSave={handleSave}
          block={{
            type: editingBlock.block_type,
            content: editingBlock.content,
          }}
          EditorComponent={LazyEditor}
        />
      )}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmDelete}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete the block."
        confirmText="Delete"
        isDestructive={true}
      />
      <BlockTypeSelector
        isOpen={isBlockSelectorOpen}
        onOpenChange={setIsBlockSelectorOpen}
        onSelectBlockType={handleSelectBlockType}
        allowedBlockTypes={availableBlockTypes.filter(
          (type) => type !== 'section' && type !== 'hero'
        )}
      />
    </div>
  );
}