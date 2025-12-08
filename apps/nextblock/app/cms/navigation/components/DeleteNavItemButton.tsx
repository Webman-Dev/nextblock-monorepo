"use client";

import { useState } from "react";
import { DropdownMenuItem } from "@nextblock-cms/ui";
import { toast } from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { deleteNavigationItem } from "../actions";
import { ConfirmationModal } from "../../components/ConfirmationModal";

interface DeleteNavItemButtonProps {
  itemId: number;
}

export default function DeleteNavItemButton({ itemId }: DeleteNavItemButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onConfirm = async () => {
    try {
      const result = await deleteNavigationItem(itemId);
      if (result.success) {
        toast.success("Item deleted");
        window.location.reload();
      } else {
        console.error("Delete operation failed:", result.error);
        toast.error(`Delete failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Exception during delete action:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <DropdownMenuItem
        className="text-red-600 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-700/20"
        onSelect={(e) => {
          e.preventDefault();
          setIsModalOpen(true);
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={onConfirm}
        title="Are you sure?"
        description="This will permanently delete the navigation item. This action cannot be undone."
      />
    </>
  );
}