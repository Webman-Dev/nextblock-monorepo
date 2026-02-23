"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import Image from 'next/image';
import { Image as ImageIconLucide, Search, CheckCircle } from 'lucide-react';
import { Button } from '@nextblock-cms/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import type { Database } from '@nextblock-cms/db';
import { createClient as createBrowserClient } from '@nextblock-cms/db';

type Media = Database['public']['Tables']['media']['Row'];

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

interface MediaLibraryModalProps {
  editor: Editor | null;
}

export const MediaLibraryModal = ({ editor }: MediaLibraryModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<Media[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createBrowserClient();

  const fetchLibrary = useCallback(async () => {
    if (!isModalOpen) return;
    setIsLoadingMedia(true);
    let query = supabase.from('media').select('*').order('created_at', { ascending: false }).limit(20);
    if (searchTerm) {
      query = query.ilike('file_name', `%${searchTerm}%`);
    }
    const { data, error } = await query;
    if (data) setMediaLibrary(data);
    else console.error("Error fetching media library:", error);
    setIsLoadingMedia(false);
  }, [isModalOpen, searchTerm, supabase]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleSelectMedia = (mediaItem: Media) => {
    if (editor && mediaItem.file_type?.startsWith("image/")) {
      const imageUrl = `${R2_BASE_URL}/${mediaItem.object_key}`;
      editor.chain().focus().insertContent(`<img src="${imageUrl}" alt="${mediaItem.description || mediaItem.file_name}" />`).run();
    }
    setIsModalOpen(false);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="Add Image" disabled={!editor?.isEditable}>
          <ImageIconLucide className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] md:max-w-[800px] lg:max-w-[1000px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Image from Media Library</DialogTitle>
        </DialogHeader>
        <div className="relative mb-4">
          <Input
            type="search"
            placeholder="Search media by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        {isLoadingMedia ? (
          <div className="flex-grow flex items-center justify-center"><p>Loading media...</p></div>
        ) : mediaLibrary.length === 0 ? (
          <div className="flex-grow flex items-center justify-center"><p>No media found.</p></div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 overflow-y-auto flex-grow pr-2">
            {mediaLibrary.filter(m => m.file_type?.startsWith("image/")).map((media) => (
              <button
                key={media.id}
                type="button"
                className="relative aspect-square border rounded-md overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => handleSelectMedia(media)}
              >
                <Image
                  src={`${R2_BASE_URL}/${media.object_key}`}
                  alt={media.description || media.file_name}
                  width={200}
                  height={200}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                 <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate text-center">
                    {media.file_name}
                </p>
              </button>
            ))}
          </div>
        )}
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};