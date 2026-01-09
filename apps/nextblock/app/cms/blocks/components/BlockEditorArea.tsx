// app/cms/blocks/components/BlockEditorArea.tsx
"use client";

import React, { useState, useTransition, useEffect, ComponentType, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import debounce from 'lodash.debounce';
import type { Database, Json } from "@nextblock-cms/db";
import { type BlockType } from "@/lib/blocks/blockRegistry";

type Block = Database["public"]["Tables"]["blocks"]["Row"];
import { getBlockDefinition, type SectionBlockContent } from "@/lib/blocks/blockRegistry";
import { Button } from "@nextblock-cms/ui";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@nextblock-cms/ui";
import BlockTypeSelector from "./BlockTypeSelector";
import {
  createBlockForPage,
  createBlockForPost,
  updateBlock,
  updateMultipleBlockOrders,
} from "../actions";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableBlockItem } from "./SortableBlockItem";
import EditableBlock from "./EditableBlock";

interface BlockEditorAreaProps {
  parentId: number;
  parentType: "page" | "post";
  initialBlocks: Block[];
  languageId: number;
}

interface NestedBlockData {
  block_type: BlockType;
  content: Json;
  temp_id?: string;
}

interface EditingNestedBlockInfo {
  parentBlockId: string;
  columnIndex: number;
  blockIndexInColumn: number;
  blockData: NestedBlockData;
}

export default function BlockEditorArea({ parentId, parentType, initialBlocks, languageId }: BlockEditorAreaProps) {
  // Prevent SSR/hydration mismatches from dnd-kit by rendering on client only
  // Important: keep hooks order stable across renders; defer early return until after hooks
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [blocks, setBlocks] = useState<Block[]>(() => initialBlocks.sort((a, b) => a.order - b.order));
  const lastSavedBlocks = useRef(blocks);
  const [isPending, startTransition] = useTransition();
  const [isSavingNested, startSavingNestedTransition] = useTransition();
  const [isBlockSelectorOpen, setIsBlockSelectorOpen] = useState(false);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [editingNestedBlockInfo, setEditingNestedBlockInfo] = useState<EditingNestedBlockInfo | null>(null);
  const [NestedBlockEditorComponent, setNestedBlockEditorComponent] = useState<ComponentType<any> | null>(null);
  const [tempNestedBlockContent, setTempNestedBlockContent] = useState<Json | null>(null);

  useEffect(() => {
    const sortedBlocks = initialBlocks.sort((a, b) => a.order - b.order);
    setBlocks(sortedBlocks);
    lastSavedBlocks.current = sortedBlocks;
  }, [initialBlocks]);

  const saveBlock = useCallback(async (blockToSave: Block) => {
    const result = await updateBlock(
      blockToSave.id,
      blockToSave.content,
      parentType === "page" ? parentId : null,
      parentType === "post" ? parentId : null
    );

    if (result.success && result.updatedBlock) {
      // On success, update the last saved state ref
      lastSavedBlocks.current = blocks;
    } else {
      // On failure, revert the UI to the last known good state
      alert(`Failed to save changes: ${result.error}. Reverting.`);
      setBlocks(lastSavedBlocks.current);
    }
  }, [parentId, parentType, blocks]);

  const debouncedSave = useCallback(
    (blockToSave: Block) => {
      const debouncedFn = debounce(saveBlock, 1200);
      debouncedFn(blockToSave);
    },
    [saveBlock]
  );

  const handleContentChange = (blockId: number, newContent: Json) => {
    const existingBlock = blocks.find(b => b.id === blockId);
    if (!existingBlock) return;
    
    const updatedBlock = {
      ...existingBlock,
      content: newContent,
    };
    setBlocks(prevBlocks => prevBlocks.map(b => b.id === blockId ? updatedBlock : b));
    debouncedSave(updatedBlock);
  };

  const DynamicTextBlockEditor = dynamic(() => import('../editors/TextBlockEditor').then(mod => mod.default), { loading: () => <p>Loading editor...</p> });
  const DynamicHeadingBlockEditor = dynamic(() => import('../editors/HeadingBlockEditor').then(mod => mod.default), { loading: () => <p>Loading editor...</p> });
  const DynamicImageBlockEditor = dynamic(() => import('../editors/ImageBlockEditor').then(mod => mod.default), { loading: () => <p>Loading editor...</p> });
  const DynamicButtonBlockEditor = dynamic(() => import('../editors/ButtonBlockEditor').then(mod => mod.default), { loading: () => <p>Loading editor...</p> });
  const DynamicPostsGridBlockEditor = dynamic(() => import('../editors/PostsGridBlockEditor').then(mod => mod.default), { loading: () => <p>Loading editor...</p> });
  const DynamicVideoEmbedBlockEditor = dynamic(() => import('../editors/VideoEmbedBlockEditor').then(mod => mod.default), { loading: () => <p>Loading editor...</p> });
  const DynamicSectionBlockEditor = dynamic(() => import('../editors/SectionBlockEditor').then(mod => mod.default), { loading: () => <p>Loading editor...</p> });

  useEffect(() => {
    if (editingNestedBlockInfo) {
      const blockType = editingNestedBlockInfo.blockData.block_type;
      let SelectedEditor: React.ComponentType<any> | null = null;

      try {
        // Check block registry for editor component
        const blockDef = getBlockDefinition(blockType);
        
        if (blockDef?.EditorComponent) {
           SelectedEditor = blockDef.EditorComponent;
        } else if (blockDef?.editorComponentFilename) {
           // We can't easily do dynamic imports with variable paths inside this useEffect 
           // without potentially breaking webpack analysis or needing a different strategy.
           // However, for the core blocks, we have the pre-defined dynamic imports below.
           
           switch (blockType) {
            case 'text':
              SelectedEditor = DynamicTextBlockEditor;
              break;
            case 'heading':
              SelectedEditor = DynamicHeadingBlockEditor;
              break;
            case 'image':
              SelectedEditor = DynamicImageBlockEditor;
              break;
            case 'button':
              SelectedEditor = DynamicButtonBlockEditor;
              break;
            case 'posts_grid':
              SelectedEditor = DynamicPostsGridBlockEditor;
              break;
            case 'video_embed':
              SelectedEditor = DynamicVideoEmbedBlockEditor;
              break;
            case 'section':
              SelectedEditor = DynamicSectionBlockEditor;
              break;
            default:
               // Fallback for custom blocks that might use file-based routing but aren't in the switch
               // This might still fail if webpack hasn't bundled them, but it's worth a try or we need to explicitly add them.
               // For the PoC Testimonial block, it has EditorComponent so it hits the first if.
               console.warn(`No dynamic editor configured for nested block type: ${blockType}`);
               alert(`Error: Editor not configured for ${blockType}.`);
               setEditingNestedBlockInfo(null);
               return;
          }
        } else {
             console.warn(`No definition found for nested block type: ${blockType}`);
             setEditingNestedBlockInfo(null);
             return;
        }
        setNestedBlockEditorComponent(() => SelectedEditor);
        setTempNestedBlockContent(JSON.parse(JSON.stringify(editingNestedBlockInfo.blockData.content)));
      } catch (error) {
        console.error(`Failed to load editor component for ${blockType}:`, error);
        alert(`Error: Could not load editor for ${blockType}.`);
        setNestedBlockEditorComponent(null);
        setTempNestedBlockContent(null);
        setEditingNestedBlockInfo(null);
      }
    } else {
      setNestedBlockEditorComponent(null);
      setTempNestedBlockContent(null);
    }
  }, [editingNestedBlockInfo, DynamicTextBlockEditor, DynamicHeadingBlockEditor, DynamicImageBlockEditor, DynamicButtonBlockEditor, DynamicPostsGridBlockEditor, DynamicVideoEmbedBlockEditor, DynamicSectionBlockEditor]);

  const handleSaveNestedBlock = () => {
    if (!editingNestedBlockInfo || tempNestedBlockContent === null) {
      console.warn("Missing info for saving nested block", { editingNestedBlockInfo, tempNestedBlockContent });
      return;
    }

    startSavingNestedTransition(() => {
      const { parentBlockId, columnIndex, blockIndexInColumn } = editingNestedBlockInfo;
      const updatedBlocks = JSON.parse(JSON.stringify(blocks)) as Block[];
      const parentSectionBlockIndex = updatedBlocks.findIndex(b => String(b.id) === parentBlockId && b.block_type === 'section');

      if (parentSectionBlockIndex === -1) {
        console.error("Parent section block not found for saving nested block:", parentBlockId);
        alert("Error: Could not find the parent section block to save changes.");
        return;
      }

      const parentSectionBlock = updatedBlocks[parentSectionBlockIndex];
      const sectionContent = parentSectionBlock.content as unknown as SectionBlockContent;

      if (!sectionContent.column_blocks || !sectionContent.column_blocks[columnIndex]) {
        console.error("Column blocks or specific column not found in parent section block:", sectionContent);
        alert("Error: Could not find the column structure to save changes.");
        return;
      }

      const copiedColumnBlocks = JSON.parse(JSON.stringify(sectionContent.column_blocks)) as SectionBlockContent['column_blocks'];

      if (!copiedColumnBlocks[columnIndex] || !copiedColumnBlocks[columnIndex][blockIndexInColumn]) {
          console.error("Nested block not found at specified indices for saving:", { columnIndex, blockIndexInColumn });
          alert("Error: Could not find the nested block to save changes.");
          return;
      }

      copiedColumnBlocks[columnIndex][blockIndexInColumn].content = tempNestedBlockContent as Record<string, unknown>;
      parentSectionBlock.content = { ...sectionContent, column_blocks: copiedColumnBlocks } as unknown as Json;

      const newBlocksState = updatedBlocks.map(b =>
        b.id === parentSectionBlock.id ? parentSectionBlock : b
      ).sort((a,b) => a.order - b.order);
      setBlocks(newBlocksState);

      startTransition(async () => {
        const result = await updateBlock(
          parentSectionBlock.id,
          parentSectionBlock.content,
          parentType === "page" ? parentId : null,
          parentType === "post" ? parentId : null
        );

        if (result.success && result.updatedBlock) {
          lastSavedBlocks.current = blocks;
          setEditingNestedBlockInfo(null);
        } else {
          alert(`Error saving nested block changes: ${result.error}`);
          setBlocks(lastSavedBlocks.current);
        }
      });
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenBlockSelector = (index: number) => {
    setInsertionIndex(index);
    setIsBlockSelectorOpen(true);
  };

  const handleAddBlock = (blockType: BlockType) => {
    if (insertionIndex === null) {
      console.error("Attempted to add a block without an insertion index.");
      return;
    }

    startTransition(async () => {
      const newOrder = insertionIndex;

      const blocksToUpdate = blocks
        .filter((b) => b.order >= newOrder)
        .map((b) => ({ id: b.id, order: b.order + 1 }));

      if (blocksToUpdate.length > 0) {
        const updateResult = await updateMultipleBlockOrders(
          blocksToUpdate,
          parentType === "page" ? parentId : null,
          parentType === "post" ? parentId : null
        );

        if (updateResult?.error) {
          alert(`Error making space for new block: ${updateResult.error}`);
          return;
        }
      }

      let createResult;
      if (parentType === "page") {
        createResult = await createBlockForPage(
          parentId,
          languageId,
          blockType,
          newOrder
        );
      } else {
        createResult = await createBlockForPost(
          parentId,
          languageId,
          blockType,
          newOrder
        );
      }

      if (createResult?.success && createResult.newBlock) {
        const newBlock = createResult.newBlock as Block;

        const updatedOldBlocks = blocks.map((b) =>
          b.order >= newOrder ? { ...b, order: b.order + 1 } : b
        );

        const finalBlocks = [...updatedOldBlocks, newBlock].sort(
          (a, b) => a.order - b.order
        );

        setBlocks(finalBlocks);
        lastSavedBlocks.current = finalBlocks;
      } else {
        alert(`Error adding block: ${createResult?.error}`);
        // TODO: Revert order changes if creation fails
      }

      setIsBlockSelectorOpen(false);
      setInsertionIndex(null);
    });
  };

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const activeBlock = blocks.find(b => b.id === active.id) || null;
    setActiveBlock(activeBlock);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveBlock(null);

    if (over && active.id !== over.id) {
      const originalBlocks = [...blocks];
      const oldIndex = originalBlocks.findIndex((item) => item.id === active.id);
      const newIndex = originalBlocks.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        console.error("Drag and drop error: item not found.", { activeId: active.id, overId: over.id });
        return;
      }

      const reorderedItemsArray = arrayMove(originalBlocks, oldIndex, newIndex);
      const finalItemsWithUpdatedOrder = reorderedItemsArray.map((item, index) => ({
        ...item,
        order: index,
      }));

      setBlocks(finalItemsWithUpdatedOrder);

      const itemsToUpdateDb = finalItemsWithUpdatedOrder.map(item => ({
        id: item.id,
        order: item.order,
      }));

      startTransition(async () => {
        const result = await updateMultipleBlockOrders(
          itemsToUpdateDb,
          parentType === "page" ? parentId : null,
          parentType === "post" ? parentId : null
        );

        if (result?.error) {
          alert(`Error reordering blocks: ${result.error}`);
          setBlocks(originalBlocks);
        } else {
          lastSavedBlocks.current = finalItemsWithUpdatedOrder;
        }
      });
    }
  }

  const handleEditNestedBlock = (parentBlockIdStr: string, columnIndex: number, blockIndexInColumn: number) => {
    const parentSectionBlock = blocks.find(b => String(b.id) === parentBlockIdStr && b.block_type === 'section');

    if (parentSectionBlock) {
      const sectionContent = parentSectionBlock.content as unknown as SectionBlockContent;
      if (sectionContent.column_blocks &&
          sectionContent.column_blocks[columnIndex] &&
          sectionContent.column_blocks[columnIndex][blockIndexInColumn]) {
        const nestedBlockData = sectionContent.column_blocks[columnIndex][blockIndexInColumn];
        setEditingNestedBlockInfo({
          parentBlockId: parentBlockIdStr,
          columnIndex,
          blockIndexInColumn,
          blockData: nestedBlockData,
        });
      } else {
        console.error("Nested block not found at specified indices:", { parentBlockIdStr, columnIndex, blockIndexInColumn });
        alert("Error: Could not find the nested block to edit.");
      }
    } else {
      console.error("Parent section block not found:", parentBlockIdStr);
      alert("Error: Could not find the parent section block.");
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="w-full mx-auto px-6">
      <BlockTypeSelector
        isOpen={isBlockSelectorOpen}
        onOpenChange={setIsBlockSelectorOpen}
        onSelectBlockType={handleAddBlock}
      />

      {blocks.length === 0 && (
        <p className="text-muted-foreground text-center py-4">No blocks yet. Add one below to get started!</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="w-full">
            {blocks.map((block, index) => (
              <div key={block.id}>
                <div
                  className="group relative py-4 w-full flex items-center justify-center cursor-pointer"
                  onClick={() => handleOpenBlockSelector(index)}
                  aria-label={`Add block before ${block.block_type}`}
                >
                  {/* Vertical Line */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-700 transform origin-center scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100 transition-all duration-300" />
                  {/* Plus Icon and Animated Circle */}
                  <div className="relative z-10">
                    {/* Animated Circle */}
                    <div className="absolute -inset-2 rounded-full bg-primary/10 dark:bg-primary/30 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-in-out" />
                    {/* Plus Icon Container */}
                    <div className="relative bg-background p-1 rounded-full">
                      <PlusCircle className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
                <SortableBlockItem
                  block={block}
                  onContentChange={handleContentChange}
                  onDelete={async (blockIdToDelete) => {
                    startTransition(async () => {
                      const result = await import("../actions").then(({ deleteBlock }) =>
                        deleteBlock(
                          blockIdToDelete,
                          parentType === "page" ? parentId : null,
                          parentType === "post" ? parentId : null
                        )
                      );
                      if (result && result.success) {
                        const newBlocks = blocks.filter((b) => b.id !== blockIdToDelete);
                        setBlocks(newBlocks);
                        lastSavedBlocks.current = newBlocks;
                      } else if (result?.error) {
                        alert(`Error deleting block: ${result.error}`);
                      }
                    });
                  }}
                  onEditNestedBlock={handleEditNestedBlock}
                />
              </div>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeBlock ? (
            <div className="bg-white shadow-lg rounded-md">
              <EditableBlock
                block={activeBlock}
                className="h-full"
                onDelete={() => {}} // eslint-disable-line @typescript-eslint/no-empty-function
                onContentChange={() => {}} // eslint-disable-line @typescript-eslint/no-empty-function
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div
        className="group relative py-4 w-full flex items-center justify-center cursor-pointer"
        onClick={() => handleOpenBlockSelector(blocks.length)}
        aria-label="Add block at the end"
      >
        {/* Vertical Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-700 transform origin-center scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100 transition-all duration-300" />
        {/* Plus Icon and Animated Circle */}
        <div className="relative z-10">
          {/* Animated Circle */}
          <div className="absolute -inset-2 rounded-full bg-primary/10 dark:bg-primary/30 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-in-out" />
          {/* Plus Icon Container */}
          <div className="relative bg-background p-1 rounded-full">
            <PlusCircle className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {editingNestedBlockInfo && (
        <Dialog open={!!editingNestedBlockInfo} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingNestedBlockInfo(null);
            setNestedBlockEditorComponent(null);
            setTempNestedBlockContent(null);
          }
        }}>
          <DialogContent className="sm:max-w-[625px] md:max-w-[725px] lg:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>
                Editing: {getBlockDefinition(editingNestedBlockInfo.blockData.block_type)?.label || editingNestedBlockInfo.blockData.block_type.replace("_", " ")}
              </DialogTitle>
              <DialogDescription>
                Modify the content of this nested block. Changes will be saved to the parent Section block.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 min-h-[300px]">
              {NestedBlockEditorComponent && tempNestedBlockContent !== null && editingNestedBlockInfo ? (
                (() => {
                  const blockType = editingNestedBlockInfo.blockData.block_type;
                  if (blockType === "posts_grid") {
                    const fullBlockForEditor: Block = {
                      block_type: editingNestedBlockInfo.blockData.block_type,
                      content: tempNestedBlockContent,
                      id: 0, // Temporary ID for nested blocks
                      language_id: languageId,
                      order: 0, // Temporary order for nested blocks
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      page_id: parentType === 'page' ? parentId : null,
                      post_id: parentType === 'post' ? parentId : null,
                    };
                    return <NestedBlockEditorComponent
                              block={fullBlockForEditor}
                              isNestedEditing={true}
                              onChange={setTempNestedBlockContent}
                           />;
                  } else {
                    return (
                      <NestedBlockEditorComponent
                        content={tempNestedBlockContent}
                        onChange={setTempNestedBlockContent}
                      />
                    );
                  }
                })()
              ) : (
                <p>Loading editor or missing data...</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditingNestedBlockInfo(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveNestedBlock} disabled={isSavingNested || isPending}>
                {isSavingNested ? "Saving..." : "Save Nested Block"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
