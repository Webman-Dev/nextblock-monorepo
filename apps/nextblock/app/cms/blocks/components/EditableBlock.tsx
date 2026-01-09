// app/cms/blocks/components/EditableBlock.tsx
"use client";

import React, { useState, Suspense, useMemo, lazy, LazyExoticComponent, ComponentType } from 'react';
import type { Database } from "@nextblock-cms/db";
import PostsGridBlockEditor from '../editors/PostsGridBlockEditor';

type Block = Database['public']['Tables']['blocks']['Row'];
import { Button, Card, CardContent, Avatar, AvatarImage, AvatarFallback } from "@nextblock-cms/ui";
import { GripVertical, Edit2, Image as ImageIcon, MessageSquareQuote } from "lucide-react";
import { getBlockDefinition, blockRegistry, BlockType } from "@/lib/blocks/blockRegistry";
import { BlockEditorModal } from './BlockEditorModal';
import { DeleteBlockButtonClient } from './DeleteBlockButtonClient';
import { cn } from '@nextblock-cms/utils';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || '';

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
  void onEditNestedBlock;
  // Move all hooks to the top before any conditional returns
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [LazyEditor, setLazyEditor] = useState<LazyExoticComponent<ComponentType<any>> | ComponentType<any> | null>(null);

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
      const blockDef = getBlockDefinition(block.block_type as BlockType);
      
      if (block.block_type === 'posts_grid') {
        const LazifiedPostsGridEditor = lazy(() => Promise.resolve({ default: PostsGridBlockEditor }));
        setLazyEditor(LazifiedPostsGridEditor);
        setEditingBlock(block);
      }
      else if (blockDef?.EditorComponent) {
        const Component = blockDef.EditorComponent;
        setLazyEditor(() => Component);
        setEditingBlock(block);
      }
      else if (blockDef?.editorComponentFilename) {
        const filename = blockDef.editorComponentFilename;
        const Editor = lazy(() => import(`../editors/${filename.replace(/\.tsx$/, '')}`));
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

    switch (currentBlockType) {
       case 'text': {
         const content = (block.content || {}) as any;
         const htmlContent = String(content.html_content || '');
         const isCentered = htmlContent.includes('text-align: center') || htmlContent.includes('class="text-center"');
         const isRight = htmlContent.includes('text-align: right') || htmlContent.includes('class="text-right"');
         const alignmentClass = isCentered ? 'text-center' : isRight ? 'text-right' : 'text-left';

         return (
             <div className="py-2">
                 <div className={cn("text-xs w-full", alignmentClass)}>
                     {htmlContent ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: htmlContent }} 
                            className={cn(
                              "prose prose-sm max-w-none [&>p]:my-0 [&>h1]:my-0 [&>h2]:my-0 [&>h3]:my-0 dark:prose-invert",
                              isCentered && "[&_*]:text-center",
                              isRight && "[&_*]:text-right"
                            )} 
                          />
                     ) : <span className="text-muted-foreground italic">Empty text block</span>}
                 </div>
             </div>
         );
       }
       case 'heading': {
          const content = (block.content || {}) as any;
          const level = content.level || 1;
          const headingAlign = content.textAlign || 'left';
          const textColor = content.textColor || 'foreground';
          
          const sizeClasses: Record<number, string> = {
            1: "text-4xl font-extrabold",
            2: "text-3xl font-bold",
            3: "text-2xl font-semibold",
            4: "text-xl font-semibold",
            5: "text-lg font-semibold",
            6: "text-base font-semibold",
          };

          const colorClasses: Record<string, string> = {
             primary: "text-primary",
             secondary: "text-secondary",
             accent: "text-accent",
             destructive: "text-destructive",
             muted: "text-muted-foreground",
             background: "text-background",
             foreground: "text-foreground"
          };

          return (
             <div className="py-2">
                  <div className={cn(
                     "w-full leading-tight",
                     sizeClasses[level] || sizeClasses[1],
                     colorClasses[textColor] || "text-foreground",
                     headingAlign === 'center' && 'text-center',
                     headingAlign === 'right' && 'text-right'
                  )}>
                     {content.text_content || <span className="text-muted-foreground italic text-sm font-normal">Empty heading</span>}
                  </div>
             </div>
          );
       }
       case 'image': {
         const content = (block.content || {}) as any;
         const imageUrl = content.object_key ? `${R2_BASE_URL}/${content.object_key}` : content.src;
         return (
              <div className="flex gap-4 py-2">
                 <div className="flex-shrink-0 h-16 w-16 bg-muted rounded overflow-hidden flex items-center justify-center border">
                     {imageUrl ? (
                         /* eslint-disable-next-line @next/next/no-img-element */
                         <img src={imageUrl} alt={content.alt_text || 'Block image'} className="h-full w-full object-cover" />
                     ) : (
                         <ImageIcon className="h-6 w-6 text-muted-foreground" />
                     )}
                 </div>
                 <div className="flex flex-col justify-center">
                     <span className="text-sm font-medium truncate max-w-[200px]">{content.alt_text || 'No description'}</span>
                     <span className="text-xs text-muted-foreground truncate max-w-[200px]">{imageUrl ? 'Image set' : 'No image selected'}</span>
                 </div>
              </div>
         );
       }
       case 'button': {
           const content = (block.content || {}) as any;
           return (
               <div className={cn("py-2 flex", 
                   content.position === 'center' ? 'justify-center' : 
                   content.position === 'right' ? 'justify-end' : 'justify-start'
               )}>
                   <Button 
                     variant={content.variant || 'default'} 
                     size={content.size || 'default'}
                     className={cn("pointer-events-none", content.variant === 'outline' && "text-foreground")}
                     tabIndex={-1}
                   >
                       {content.text || 'Button'}
                   </Button>
               </div>
           );
       }
       case 'video_embed': {
            const content = (block.content || {}) as any;
            return (
                <div className="py-2">
                    <div className="text-sm text-muted-foreground truncate">
                        📹 {content.title || content.url || 'No Video configured'}
                    </div>
                </div>
            );
       }
       case 'posts_grid': {
             const content = (block.content || {}) as any;
             return (
                 <div className="py-2">
                     <div className="text-sm text-muted-foreground">
                         Posts Grid: {content.columns || 3} cols, {content.postsPerPage || 12} items
                     </div>
                 </div>
             );
       }
       case 'testimonial': {
            const content = (block.content || {}) as any;
            return (
                <div className="py-2">
                    <Card className="h-full border-none shadow-none bg-transparent">
                      <CardContent className="pt-2 flex flex-col gap-4 h-full p-4">
                        <MessageSquareQuote className="w-8 h-8 text-primary/40" />
                        
                        <blockquote className="flex-grow text-lg italic text-muted-foreground leading-relaxed">
                          "{content.quote || 'No quote provided'}"
                        </blockquote>

                        <div className="flex items-center gap-3 mt-2">
                          <Avatar>
                            {content.image_url && <AvatarImage src={content.image_url} alt={content.author_name} />}
                            <AvatarFallback>{(content.author_name || 'A').slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <div className="font-semibold">{content.author_name || 'Author Name'}</div>
                            {content.author_title && (
                              <div className="text-sm text-muted-foreground">{content.author_title}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                </div>
            );
       }
       default: {
        const blockDefinition = getBlockDefinition(currentBlockType as BlockType);
        const blockLabel = blockDefinition?.label || currentBlockType;
        return (
          <div
            className="py-4 flex flex-col items-center justify-center space-y-2 min-h-[80px] border border-dashed rounded-md bg-muted/20 cursor-pointer hover:border-primary"
            onClick={handleCardClick}
          >
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">{blockLabel}</p>
              <p className="text-xs text-muted-foreground">Click edit to modify content</p>
            </div>
          </div>
        );
       }
    }
  };

  const isSection = block?.block_type === 'section' || block?.block_type === 'hero';
  const blockDefinition = getBlockDefinition(block.block_type as BlockType);

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "p-4 border rounded-lg bg-card shadow",
        !isSection && "cursor-pointer hover:border-primary transition-colors",
        className
      )}
    >
      <div className="flex justify-between items-center mb-2 pb-2 border-b">
        <div className="flex items-center gap-2">
          <button {...dragHandleProps} className="p-1 rounded-md hover:bg-muted cursor-grab" aria-label="Drag to reorder">
            <GripVertical className="h-5 w-5" />
          </button>
          <h4 className="font-semibold p-0 m-0 mb-1">{blockDefinition?.label || block.block_type}</h4>
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
