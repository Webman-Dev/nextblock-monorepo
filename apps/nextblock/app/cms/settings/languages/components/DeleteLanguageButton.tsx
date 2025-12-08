"use client";

import { DropdownMenuItem } from "@nextblock-cms/ui";
import { Trash2, ShieldAlert } from "lucide-react";
import { deleteLanguage } from "../actions"; // Server action
import type { Database } from "@nextblock-cms/db";
import { useTransition, useState } from 'react';
import { ConfirmationModal } from "@/app/cms/components/ConfirmationModal";
import { toast } from 'react-hot-toast';

type Language = Database['public']['Tables']['languages']['Row'];

interface DeleteLanguageClientButtonProps {
  language: Language;
}

export default function DeleteLanguageClientButton({ language }: DeleteLanguageClientButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // A more robust check for "is_default and is the only default language" should ideally
  // be handled by the server action or by passing allLanguages to this component.
  // For UI hint, this is a simplified check. The server action has the final say.
  const isDefaultLanguage = language.is_default;

  const handleDeleteConfirm = () => {
    // The server-side `deleteLanguage` action already checks if it's the default
    // and if it's the only language. This client-side check is for immediate UX.
    if (isDefaultLanguage) {
      // The server action has a more robust check for "only default"
      // For now, a simple alert for any default language.
       toast.error("Cannot delete the default language. Please set another language as default first, or ensure this is not the only language.");
       setIsModalOpen(false);
       return;
    }

    startTransition(async () => {
      const result = await deleteLanguage(language.id); // Call the server action
      if (result?.error) {
        toast.error(`Error: ${result.error}`);
      }
      // Revalidation and redirection are handled by the server action itself.
      setIsModalOpen(false);
    });
  };

  return (
    <>
      <DropdownMenuItem
        className={`hover:!bg-red-50 dark:hover:!bg-red-700/20 ${
          isDefaultLanguage // Visually hint if it's default, server action has final say on deletability
            ? "text-muted-foreground cursor-not-allowed hover:!text-muted-foreground"
            : "text-red-600 hover:!text-red-600 cursor-pointer"
        }`}
        onSelect={(e) => e.preventDefault()} // Prevent menu closing immediately
        onClick={() => !isPending && !isDefaultLanguage && setIsModalOpen(true)}
        disabled={isPending || isDefaultLanguage} // Disable if pending or if it's the default language
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isPending ? "Deleting..." : "Delete"}
        {isDefaultLanguage && (
          <span title="This is the default language. Deletion might be restricted.">
            <ShieldAlert className="ml-auto h-4 w-4 text-amber-500" />
          </span>
        )}
      </DropdownMenuItem>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Are you sure?"
        description="This will permanently delete the language. This action cannot be undone."
      />
    </>
  );
}