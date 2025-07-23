"use client";

import React, { useState, useTransition, useEffect } from "react";
import type { Database } from "@nextblock-monorepo/db";
import { Button } from "@nextblock-monorepo/ui";

type Media = Database['public']['Tables']['media']['Row'];
import { Checkbox } from "@nextblock-monorepo/ui";
import { Trash2, Edit3, MoreHorizontal, FileText, Image as ImageIconLucideHost, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@nextblock-monorepo/ui";
import MediaImage from "./MediaImage";
import DeleteMediaButtonClient from "./DeleteMediaButtonClient"; // For single item deletion
import { deleteMultipleMediaItems } from "../actions"; // Server action for bulk delete

interface MediaGridClientProps {
  initialMediaItems: Media[];
  r2BaseUrl: string;
}

interface MessageState {
  type: "success" | "error";
  text: string;
}

export default function MediaGridClient({ initialMediaItems, r2BaseUrl }: MediaGridClientProps) {
  const [selectedItems, setSelectedItems] = useState<Array<{ id: string; objectKey: string }>>([]);
  const [mediaItems, setMediaItems] = useState<Media[]>(initialMediaItems);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMediaItems(initialMediaItems);
  }, [initialMediaItems]);

  const handleSelectionChange = (itemId: string, objectKey: string, checked: boolean) => {
    setSelectedItems((prevSelected) => {
      if (checked) {
        return [...prevSelected, { id: itemId, objectKey }];
      } else {
        return prevSelected.filter((item) => item.id !== itemId);
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      setMessage({ type: "error", text: "No items selected for deletion." });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await deleteMultipleMediaItems(selectedItems);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result.success) {
        setMessage({ type: "success", text: result.success });
        // The page should revalidate and fetch new mediaItems.
        // For immediate UI update, we can filter out deleted items:
        setMediaItems((prevItems) =>
          prevItems.filter((item) => !selectedItems.find((selected) => selected.id === item.id))
        );
        setSelectedItems([]); // Clear selection
      }
    });
  };

  const isSelected = (itemId: string) => {
    return selectedItems.some((item) => item.id === itemId);
  };

  return (
    <div className="space-y-6">
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <p className="text-sm font-medium">
            {selectedItems.length} item(s) selected
          </p>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isPending ? "Deleting..." : "Delete Selected"}
          </Button>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-md text-sm ${
            message.type === "success"
              ? "bg-green-100 border border-green-200 text-green-700"
              : "bg-red-100 border border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center">
            {message.type === 'error' && <AlertCircle className="h-5 w-5 mr-2" />}
            {message.text}
          </div>
        </div>
      )}

      {mediaItems.length === 0 && selectedItems.length === 0 ? (
         <div className="text-center py-10 border rounded-lg mt-6">
           <ImageIconLucideHost className="mx-auto h-12 w-12 text-muted-foreground" />
           <h3 className="mt-2 text-sm font-medium text-foreground">No media found</h3>
           <p className="mt-1 text-sm text-muted-foreground">
             Upload some files to get started.
           </p>
         </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              className={`group relative border rounded-lg overflow-hidden shadow-sm aspect-square bg-muted/20 transition-all
                ${isSelected(item.id) ? "ring-2 ring-primary ring-offset-2" : ""}`}
            >
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  id={`select-${item.id}`}
                  checked={isSelected(item.id)}
                  onCheckedChange={(checked) => {
                    handleSelectionChange(item.id, item.object_key, !!checked);
                  }}
                  aria-label={`Select ${item.file_name}`}
                  className="bg-white/70 hover:bg-white border-slate-400 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </div>

              {item.file_type?.startsWith("image/") ? (
                <MediaImage
                  src={`${r2BaseUrl}/${item.object_key}`}
                  alt={item.description || item.file_name}
                  width={item.width || 500} // Default width if null
                  height={item.height || 500} // Default height if null
                  blurDataURL={item.blur_data_url || undefined}
                  className="h-full w-full object-contain transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-muted flex flex-col items-center justify-center p-2">
                  <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-xs text-center text-muted-foreground truncate w-full" title={item.file_name}>
                    {item.file_name}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="text-xs text-white truncate pt-1" title={item.file_name}>{item.file_name}</div>
                <div className="self-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="text-white bg-black/40 hover:bg-black/60 h-7 w-7 rounded-full">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/cms/media/${item.id}/edit`} className="flex items-center cursor-pointer">
                                <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DeleteMediaButtonClient mediaItem={item} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}