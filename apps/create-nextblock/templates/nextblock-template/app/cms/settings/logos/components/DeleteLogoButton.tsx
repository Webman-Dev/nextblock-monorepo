"use client";

import { DropdownMenuItem } from "@nextblock-cms/ui";
import { Trash2 } from "lucide-react";
import { deleteLogo } from "../actions";
import { useTransition, useState } from 'react';
import { ConfirmationModal } from "@/app/cms/components/ConfirmationModal";
import { toast } from 'react-hot-toast';

interface DeleteLogoButtonProps {
  logoId: string;
}

export default function DeleteLogoButton({ logoId }: DeleteLogoButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const result = await deleteLogo(logoId);
      if (result?.error) {
        toast.error(`Error: ${result.error}`);
      } else {
          toast.success("Logo deleted successfully");
      }
      setIsModalOpen(false);
    });
  };

  return (
    <>
      <DropdownMenuItem
        className="text-red-600 hover:!text-red-600 cursor-pointer hover:!bg-red-50 dark:hover:!bg-red-700/20"
        onSelect={(e) => e.preventDefault()}
        onClick={() => !isPending && setIsModalOpen(true)}
        disabled={isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isPending ? "Deleting..." : "Delete"}
      </DropdownMenuItem>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Logo?"
        description="This will permanently delete the logo. This action cannot be undone."
      />
    </>
  );
}
