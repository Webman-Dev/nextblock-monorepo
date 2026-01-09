"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@nextblock-cms/ui";
import { ConfirmationDialog } from "@nextblock-cms/ui";

interface Props {
  blockId: number;
  blockTitle: string;
  onDelete: (blockId: number) => void;
}

export function DeleteBlockButtonClient({
  blockId,
  blockTitle,
  onDelete,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    onDelete(blockId);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label={`Delete block ${blockTitle}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmationDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={`Delete ${blockTitle}`}
        description={`Are you sure you want to delete the block "${blockTitle}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        isDestructive={true}
      />
    </>
  );
}