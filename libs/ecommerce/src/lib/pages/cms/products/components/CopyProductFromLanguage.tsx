'use client';

import React, { useState, useTransition, useEffect } from "react";
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
import { copyProductFromLanguageAction, getProductTranslations } from '../actions';
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Copy as CopyIcon } from "lucide-react";

interface CopyProductFromLanguageProps {
  productId: string;
  currentLanguageId: number;
  translationGroupId: string;
  allSiteLanguages: any[];
}

export function CopyProductFromLanguage({
  productId,
  currentLanguageId,
  translationGroupId,
  allSiteLanguages,
}: CopyProductFromLanguageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSourceProductId, setSelectedSourceProductId] = useState<string | null>(null);
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (isModalOpen && translationGroupId) {
      const fetchSources = async () => {
        setIsLoadingSources(true);
        try {
          const translations = await getProductTranslations(translationGroupId);
          // Filter out current product
          const sources = translations.filter(t => t.id !== productId);
          setAvailableSources(sources);
        } catch (error) {
          console.error("Error fetching translations:", error);
        } finally {
          setIsLoadingSources(false);
        }
      };
      fetchSources();
    }
  }, [isModalOpen, translationGroupId, productId]);

  const handleCopy = async () => {
    if (!selectedSourceProductId) {
      setMessage({
        type: "error",
        text: "Please select a source version to copy from.",
      });
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await copyProductFromLanguageAction(productId, selectedSourceProductId);

      if (result.success) {
        setMessage({
          type: "success",
          text: "Content copied successfully. The page will now refresh.",
        });
        setTimeout(() => {
            setIsModalOpen(false);
            router.refresh();
        }, 1500);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to copy content.",
        });
      }
    });
  };

  const currentLang = allSiteLanguages.find(l => l.id === currentLanguageId);

  return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" title="Copy content from another language">
            <CopyIcon className="h-4 w-4 mr-2" />
            Copy Content...
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Content from Another Language</DialogTitle>
            <DialogDescription>
              Select a source version to copy from. This will replace the title, description, and media of the current product ({currentLang?.name}). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="sourceProduct">Select Source Version</Label>
                <Select
                    onValueChange={(value) => setSelectedSourceProductId(value)}
                    disabled={isPending || isLoadingSources}
                    value={selectedSourceProductId || undefined}
                >
                    <SelectTrigger id="sourceProduct">
                        <SelectValue placeholder={isLoadingSources ? "Loading versions..." : "Select a version..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {availableSources.length > 0 ? (
                            availableSources.map((source) => {
                                const lang = allSiteLanguages.find(l => l.id === source.language_id);
                                return (
                                    <SelectItem key={source.id} value={source.id}>
                                        {source.title} ({lang?.name || 'Unknown Language'})
                                    </SelectItem>
                                );
                            })
                        ) : (
                            <SelectItem value="none" disabled>No other versions available</SelectItem>
                        )}
                    </SelectContent>
                </Select>
             </div>

            {message && (
                <div
                className={`p-3 rounded-md text-sm flex items-center gap-2 ${
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
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleCopy} 
              disabled={isPending || !selectedSourceProductId || selectedSourceProductId === 'none'}
            >
              {isPending ? "Copying..." : "Copy Content & Replace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
