"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { resolveMediaUrl } from '../../../../lib/media/resolveMediaUrl';

type Media = Database['public']['Tables']['media']['Row'];

const MEDIA_REQUEST_TIMEOUT_MS = 8000;
const MEDIA_LIBRARY_LIMIT = 20;

function resolveMediaPreviewPath(media: Media) {
  return media.file_path || media.object_key || null;
}

function resolveMediaPreviewSrc(path: string) {
  return resolveMediaUrl(path);
}

interface MediaLibraryModalProps {
  editor: Editor | null;
}

export const MediaLibraryModal = ({ editor }: MediaLibraryModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<Media[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const requestIdRef = useRef(0);

  const fetchLibrary = useCallback(async () => {
    if (!isModalOpen) return;
    const requestId = ++requestIdRef.current;
    setIsLoadingMedia(true);
    setLoadError(null);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(
        () => controller.abort(new Error('Media library request timed out.')),
        MEDIA_REQUEST_TIMEOUT_MS
      );
      const params = new URLSearchParams({
        limit: MEDIA_LIBRARY_LIMIT.toString(),
      });

      if (searchTerm.trim()) {
        params.set('q', searchTerm.trim());
      }

      const response = await fetch(`/api/media/library?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const payload = (await response.json()) as {
        items?: Media[];
        error?: string;
      };

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!response.ok) {
        console.error('Error fetching media library:', payload.error);
        setMediaLibrary([]);
        setLoadError(payload.error || 'We could not load the media library. Please retry.');
        return;
      }

      setMediaLibrary(payload.items || []);
    } catch (error: any) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error('Error fetching media library:', error);
      setMediaLibrary([]);
      if (error?.name === 'AbortError' || error?.message === 'Media library request timed out.') {
        setLoadError('The media library took too long to respond. Please retry.');
      } else {
        setLoadError('We could not load the media library. Please retry.');
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (requestId === requestIdRef.current) {
        setIsLoadingMedia(false);
      }
    }
  }, [isModalOpen, searchTerm]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleSelectMedia = (mediaItem: Media) => {
    const previewPath = resolveMediaPreviewPath(mediaItem);
    const imageUrl = previewPath ? resolveMediaPreviewSrc(previewPath) : null;
    if (editor && mediaItem.file_type?.startsWith("image/") && imageUrl) {
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
        ) : loadError ? (
          <div className="flex-grow flex flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void fetchLibrary()}>
              Retry
            </Button>
          </div>
        ) : mediaLibrary.length === 0 ? (
          <div className="flex-grow flex items-center justify-center"><p>No media found.</p></div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 overflow-y-auto flex-grow pr-2">
            {mediaLibrary.filter(m => m.file_type?.startsWith("image/")).map((media) => {
              const previewPath = resolveMediaPreviewPath(media);
              const previewSrc = previewPath ? resolveMediaPreviewSrc(previewPath) : null;

              return (
                <button
                  key={media.id}
                  type="button"
                  className="relative aspect-square border rounded-md overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={() => handleSelectMedia(media)}
                >
                  {previewSrc ? (
                    <Image
                      src={previewSrc}
                      alt={media.description || media.file_name}
                      width={200}
                      height={200}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                      Preview unavailable
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                   <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate text-center">
                      {media.file_name}
                  </p>
                </button>
              );
            })}
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
