"use client";

import React, { useState } from "react";
import { Button } from "@nextblock-cms/ui";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { CloudLightning, Trash2, Loader2 } from "lucide-react";
import {
  publishVisualEditingDraft,
  discardVisualEditingDraft,
  publishVisualEditingProductDraft,
  discardVisualEditingProductDraft,
} from "../../actions/visualEditingActions";

interface DraftStatusActionsProps {
  parentId: string | number;
  parentType: "page" | "post" | "product";
  hasDraft: boolean;
}

export default function DraftStatusActions({
  parentId,
  parentType,
  hasDraft,
}: DraftStatusActionsProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  if (!hasDraft) {
    return null;
  }

  const handlePublish = async () => {
    setIsPublishing(true);
    const toastId = toast.loading("Publishing changes live...");
    try {
      let res;
      if (parentType === "product") {
        res = await publishVisualEditingProductDraft(String(parentId));
      } else {
        res = await publishVisualEditingDraft(
          parentType as "page" | "post",
          Number(parentId)
        );
      }

      if (res && "error" in res && res.error) {
        toast.error(`Publish failed: ${res.error}`, { id: toastId });
      } else {
        toast.success("Changes published live successfully!", { id: toastId });
        router.refresh();
        // Give NextJS server components a tiny bit of time to refresh, then reload the page
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err: any) {
      toast.error(`Error publishing: ${err.message || err}`, { id: toastId });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm("Are you sure you want to discard all draft changes? This action cannot be undone.")) {
      return;
    }
    setIsDiscarding(true);
    const toastId = toast.loading("Discarding draft changes...");
    try {
      let res;
      if (parentType === "product") {
        res = await discardVisualEditingProductDraft(String(parentId));
      } else {
        res = await discardVisualEditingDraft(
          parentType as "page" | "post",
          Number(parentId)
        );
      }

      if (res && "error" in res && res.error) {
        toast.error(`Discard failed: ${res.error}`, { id: toastId });
      } else {
        toast.success("Draft changes discarded successfully.", { id: toastId });
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err: any) {
      toast.error(`Error discarding: ${err.message || err}`, { id: toastId });
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <div
      data-nextblock-draft-toolbar
      className="fixed bottom-6 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-3.5 rounded-full border border-amber-500/30 bg-background/95 px-4 py-2 text-sm shadow-xl backdrop-blur-md transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-center gap-2 px-1">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </div>
        <span className="font-semibold text-amber-800 dark:text-amber-300 text-[11px] uppercase tracking-wider select-none">
          Unpublished Draft
        </span>
      </div>
      <div className="h-4 w-[1px] bg-border" />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full border-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 hover:text-amber-900 dark:hover:text-amber-200 px-3.5 text-xs"
          onClick={handleDiscard}
          disabled={isDiscarding || isPublishing}
        >
          {isDiscarding ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          Discard
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-8 rounded-full bg-amber-600 hover:bg-amber-500 text-white border-0 shadow-md shadow-amber-600/10 px-4 text-xs font-medium"
          onClick={handlePublish}
          disabled={isDiscarding || isPublishing}
        >
          {isPublishing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <CloudLightning className="mr-1.5 h-3.5 w-3.5" />
          )}
          Publish
        </Button>
      </div>
    </div>
  );
}
