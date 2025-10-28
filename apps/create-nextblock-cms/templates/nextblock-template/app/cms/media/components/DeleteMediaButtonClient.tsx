// app/cms/media/components/DeleteMediaButtonClient.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { DropdownMenuItem } from "@nextblock-cms/ui";
import { Trash2 } from "lucide-react";
import type { Database } from "@nextblock-cms/db";
import { deleteMediaItem } from "../actions";
import { ConfirmationModal } from '@/app/cms/components/ConfirmationModal';

type Media = Database['public']['Tables']['media']['Row'];

interface DeleteMediaButtonClientProps {
  mediaItem: Media;
}

export default function DeleteMediaButtonClient({ mediaItem }: DeleteMediaButtonClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteMediaItem(mediaItem.id, mediaItem.object_key);
      setIsModalOpen(false);
    });
  };

  const handleSelect = (event: Event) => {
    event.preventDefault();
    setIsModalOpen(true);
  };

  return (
    <>
      <DropdownMenuItem
        className="text-red-600 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-700/20 cursor-pointer"
        onSelect={handleSelect}
        disabled={isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isPending ? 'Deleting...' : 'Delete'}
      </DropdownMenuItem>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        title="Are you sure?"
        description="This will permanently delete the media file. This action cannot be undone."
        confirmText={isPending ? 'Deleting...' : 'Delete'}
      />
    </>
  );
}