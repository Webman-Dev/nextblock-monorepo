// app/cms/posts/components/DeletePostButtonClient.tsx
"use client";

import React, { useState, useRef } from 'react';
import { DropdownMenuItem } from "@nextblock-cms/ui";
import { Trash2 } from "lucide-react";
import { deletePost } from "../actions";
import { ConfirmationModal } from '@/app/cms/components/ConfirmationModal';

interface DeletePostButtonClientProps {
  postId: number;
}

export default function DeletePostButtonClient({ postId }: DeletePostButtonClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const deletePostActionWithId = deletePost.bind(null, postId);

  const handleSelect = (event: Event) => {
    event.preventDefault();
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <form action={deletePostActionWithId} ref={formRef} className="w-full">
        {/* The button is now of type button to prevent form submission on click */}
        <button type="button" className="w-full text-left" onClick={(e) => e.preventDefault()}>
          <DropdownMenuItem
            className="text-red-600 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-700/20 cursor-pointer"
            onSelect={handleSelect}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </button>
      </form>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Are you sure?"
        description="This will permanently delete the post. This action cannot be undone."
      />
    </>
  );
}