"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@nextblock-cms/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@nextblock-cms/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nextblock-cms/ui";
import { Label } from "@nextblock-cms/ui";
import { copyBlocksFromLanguage } from "@/app/cms/blocks/actions";
import type { Database } from "@nextblock-cms/db";
import { useRouter } from "next/navigation";

type Language = Database['public']['Tables']['languages']['Row'];
import { AlertCircle, CheckCircle2, Copy as CopyIcon } from "lucide-react";

interface CopyContentFromLanguageProps {
  parentId: number;
  parentType: "page" | "post";
  currentLanguageId: number;
  translationGroupId: string;
  allSiteLanguages: Language[];
}

export default function CopyContentFromLanguage({
  parentId,
  parentType,
  currentLanguageId,
  translationGroupId,
  allSiteLanguages,
}: CopyContentFromLanguageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSourceLanguageId, setSelectedSourceLanguageId] = useState<
    number | null
  >(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCopy = async () => {
    if (!selectedSourceLanguageId) {
      setMessage({
        type: "error",
        text: "Please select a source language.",
      });
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await copyBlocksFromLanguage(
          parentId,
          parentType,
          selectedSourceLanguageId,
          currentLanguageId,
          translationGroupId
        );

        if (result.success) {
          setMessage({
            type: "success",
            text: "Content copied successfully. The page will now refresh.",
          });
          router.refresh();
          // setIsModalOpen(false); // Refresh might close it, or parent re-render
        } else {
          setMessage({
            type: "error",
            text: result.error || "Failed to copy content. Please try again.",
          });
        }
      } catch (error) {
        console.error("Error copying content:", error);
        setMessage({
          type: "error",
          text: "An unexpected error occurred. Please try again.",
        });
      }
    });
  };

  const availableSourceLanguages = allSiteLanguages.filter(
    (lang) => lang.id !== currentLanguageId
  );

  // Reset message when modal opens or source language changes
  React.useEffect(() => {
    if (isModalOpen) {
      setMessage(null);
    }
  }, [isModalOpen, selectedSourceLanguageId]);
  
  // Close modal on successful copy after refresh (if not already closed by refresh)
  React.useEffect(() => {
    if (message?.type === "success" && !isPending) {
      const timer = setTimeout(() => {
        setIsModalOpen(false);
      }, 1500); // Give some time for the user to see the success message
      return () => clearTimeout(timer);
    }
  }, [message, isPending]);


  if (availableSourceLanguages.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled title="No other languages available to copy from">
        <CopyIcon className="h-4 w-4 mr-2" />
        Copy Content...
      </Button>
    );
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Copy content from another language">
          <CopyIcon className="h-4 w-4 mr-2" />
          Copy Content...
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Content from Another Language</DialogTitle>
          <DialogDescription>
            Select a source language. This will replace all existing blocks for the current language with blocks from the selected language. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sourceLanguageModal">Select Source Language</Label>
            <Select
              onValueChange={(value) => {
                setSelectedSourceLanguageId(Number(value));
                setMessage(null); // Clear message on new selection
              }}
              disabled={isPending}
              value={selectedSourceLanguageId ? String(selectedSourceLanguageId) : undefined}
            >
              <SelectTrigger id="sourceLanguageModal" className="w-full">
                <SelectValue placeholder="Select a language..." />
              </SelectTrigger>
              <SelectContent>
                {availableSourceLanguages.map((lang) => (
                  <SelectItem key={lang.id} value={String(lang.id)}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {message && (
            <div
              className={`mt-3 p-3 rounded-md text-sm flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={() => setMessage(null)}>Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleCopy} 
            disabled={!selectedSourceLanguageId || isPending}
          >
            {isPending ? "Copying..." : "Copy Content & Replace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}