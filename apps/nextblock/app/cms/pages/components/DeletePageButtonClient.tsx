// app/cms/pages/components/DeletePageButtonClient.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { DropdownMenuItem } from "@nextblock-cms/ui";
import { Trash2 } from "lucide-react";
import { deletePage } from "../actions";
import { ConfirmationModal } from '@/app/cms/components/ConfirmationModal';

interface DeletePageButtonClientProps {
  pageId: number;
  pageTitle: string;
}

export default function DeletePageButtonClient({ pageId, pageTitle }: DeletePageButtonClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(() => {
      deletePage(pageId);
    });
  };

  return (
    <>
      <DropdownMenuItem
        className="text-red-600 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-700/20 cursor-pointer"
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
        onConfirm={handleDelete}
        title="Are you sure?"
        description={`This will permanently delete the page '${pageTitle}'. This action cannot be undone.`}
        confirmText={isPending ? "Deleting..." : "Delete"}
      />
    </>
  );
}