import { useState, useEffect, type ComponentType, Suspense, LazyExoticComponent, useCallback } from "react";
import { cn } from "@nextblock-cms/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@nextblock-cms/ui";
import { Button } from "@nextblock-cms/ui";
import { blockRegistry, type BlockType } from "@/lib/blocks/blockRegistry";

// A generic representation of a block object.
// The modal primarily needs `type` to get the label and `content` for editing.
export type Block<T = unknown> = {
  type: BlockType;
  content: T;
  [key: string]: unknown; // Allow other properties from the DB
};

// Props that every block editor component must accept.
export type BlockEditorProps<T = unknown> = {
  block: Block<T>;
  content: T;
  onChange: (newContent: T) => void;
  className?: string; // Added for editor component styling
  sectionBackground?: import("@/lib/blocks/blockRegistry").SectionBlockContent['background'];
};

type BlockEditorModalProps = {
  block: Block;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContent: unknown) => void;
  EditorComponent: LazyExoticComponent<ComponentType<BlockEditorProps<unknown>>> | ComponentType<BlockEditorProps<unknown>>;
  sectionBackground?: import("@/lib/blocks/blockRegistry").SectionBlockContent['background'];
};

export function BlockEditorModal({
  block,
  isOpen,
  onClose,
  onSave,
  EditorComponent,
  sectionBackground,
}: BlockEditorModalProps) {
  const [tempContent, setTempContent] = useState(block.content);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const isValid = true; // Placeholder for future validation logic

  useEffect(() => {
    // When the modal is opened with a new block, reset the temp content
    if (isOpen) {
      setTempContent(block.content);
      setShowConfirmClose(false);
    }
  }, [isOpen, block.content]);

  const handleSave = () => {
    onSave(tempContent);
  };

  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(block.content) !== JSON.stringify(tempContent);
  }, [block.content, tempContent]);

  const handleCloseAttempt = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleContentChange = (newContent: unknown) => {
    setTempContent(newContent);
    // Potentially add validation here and set isValid
  };

  const blockInfo = blockRegistry[block.type];
  const displayText = blockInfo?.label || "Block";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseAttempt();
        }
      }}>
        <DialogContent 
          className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
          onInteractOutside={(e) => {
            e.preventDefault();
            handleCloseAttempt();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleCloseAttempt();
          }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur z-10">
                <div className="flex items-center gap-2">
                   <DialogTitle className="text-lg font-semibold">Edit {displayText}</DialogTitle>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCloseAttempt}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!isValid} size="sm">
                      Save (CMD+S)
                    </Button>
                 </div>
            </div>

            {/* Editor Area with Contextual Background */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className={cn(
                  "flex-1 overflow-y-auto p-6",
                  // Conditional Background Logic:
                  // Only apply specific section background to 'text' and 'heading' blocks to allow "Live Preview" of copy.
                  // For complex blocks like Forms, Buttons, etc., keep a neutral background to ensure input field contrast.
                  (block.type === 'text' || block.type === 'heading') ? (
                     // If no specific background, use white/dark default
                     (!sectionBackground || sectionBackground.type === 'none') && "bg-muted/10"
                  ) : "bg-muted/10", // Default for non-text blocks

                  // Apply theme classes if present (ONLY for text/heading)
                  (block.type === 'text' || block.type === 'heading') && sectionBackground?.type === 'theme' && sectionBackground.theme === 'primary' && 'bg-primary text-primary-foreground',
                  (block.type === 'text' || block.type === 'heading') && sectionBackground?.type === 'theme' && sectionBackground.theme === 'secondary' && 'bg-secondary text-secondary-foreground',
                  (block.type === 'text' || block.type === 'heading') && sectionBackground?.type === 'theme' && sectionBackground.theme === 'muted' && 'bg-muted text-muted-foreground',
                  
                   // Dark mode prose invert if dark background (approximate check for solid color)
                  (block.type === 'text' || block.type === 'heading') && (sectionBackground?.type === 'solid' && sectionBackground.solid_color && ['#000', '#111', '#0f172a', 'black'].some(c => sectionBackground.solid_color?.includes(c))) && "[&_.prose]:prose-invert"
              )}
              style={{
                  // Only apply custom color/gradient styles for text/heading
                  backgroundColor: (block.type === 'text' || block.type === 'heading') && sectionBackground?.type === 'solid' ? sectionBackground.solid_color : undefined,
                  backgroundImage: (block.type === 'text' || block.type === 'heading') && sectionBackground?.type === 'gradient' && sectionBackground.gradient ? 
                    `${sectionBackground.gradient.type}-gradient(${sectionBackground.gradient.direction}, ${sectionBackground.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})` 
                    : undefined
              }}
            >
               <div className="max-w-6xl mx-auto">
                  <Suspense fallback={<div className="flex justify-center items-center h-32">Loading editor...</div>}>
                    <EditorComponent 
                        block={block}
                        content={tempContent} 
                        onChange={handleContentChange} 
                        className="bg-transparent border-none shadow-none focus-within:ring-0 min-h-[60vh]" // Make editor transparent
                        sectionBackground={sectionBackground} // Pass down if editor supports it
                    />
                  </Suspense>
               </div>
            </div>
            
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Do you want to save them before closing?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowConfirmClose(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              setShowConfirmClose(false);
              onClose();
            }}>
              Discard
            </Button>
             <Button onClick={() => {
              setShowConfirmClose(false);
              handleSave();
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
