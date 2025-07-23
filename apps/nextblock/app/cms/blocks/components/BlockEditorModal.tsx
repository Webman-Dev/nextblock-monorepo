"use client";

import { useState, useEffect, type ComponentType, Suspense, LazyExoticComponent } from "react";
import { cn } from "@nextblock-monorepo/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@nextblock-monorepo/ui";
import { Button } from "@nextblock-monorepo/ui";
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
};

type BlockEditorModalProps = {
  block: Block;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContent: unknown) => void;
  EditorComponent: LazyExoticComponent<ComponentType<BlockEditorProps<unknown>>>;
};

export function BlockEditorModal({
  block,
  isOpen,
  onClose,
  onSave,
  EditorComponent,
}: BlockEditorModalProps) {
  const [tempContent, setTempContent] = useState(block.content);

  useEffect(() => {
    // When the modal is opened with a new block, reset the temp content
    if (isOpen) {
      setTempContent(block.content);
    }
  }, [isOpen, block.content]);

  const handleSave = () => {
    onSave(tempContent);
  };

  const blockInfo = blockRegistry[block.type];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn("w-[90%] max-w-6xl max-h-[90vh] overflow-y-auto", {
          "h-[90vh] flex flex-col": block.type === "text",
        })}
      >
        <DialogHeader>
          <DialogTitle>Editing {blockInfo?.label || "Block"}</DialogTitle>
          <DialogDescription>
            Make changes to your block here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex-grow flex flex-col">
          <Suspense fallback={<div className="flex justify-center items-center h-32">Loading editor...</div>}>
            <EditorComponent
              block={block}
              content={tempContent}
              onChange={setTempContent}
            />
          </Suspense>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}