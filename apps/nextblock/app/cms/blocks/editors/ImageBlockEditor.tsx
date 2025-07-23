// app/cms/blocks/editors/ImageBlockEditor.tsx
"use client";

import React, { useState, useEffect } from 'react'; // Removed useTransition as it's not used here
import Image from 'next/image';
import { Label } from "@nextblock-monorepo/ui";
import { Input } from "@nextblock-monorepo/ui";
import { Button } from "@nextblock-monorepo/ui";
import type { Database } from "@nextblock-monorepo/db";
import { createClient as createBrowserClient } from '@nextblock-monorepo/db';

type Media = Database['public']['Tables']['media']['Row'];
export type ImageBlockContent = {
    media_id: string | null;
    object_key: string | null;
    alt_text: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
    blur_data_url: string | null;
};
import { ImageIcon, CheckCircle, Search, X as XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@nextblock-monorepo/ui';
import MediaUploadForm from '../../media/components/MediaUploadForm'; // Import the upload form
import { Separator } from '@nextblock-monorepo/ui'; // For visual separation
import { BlockEditorProps } from '../components/BlockEditorModal';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

export default function ImageBlockEditor({ content, onChange }: BlockEditorProps<Partial<ImageBlockContent>>) {
  const [selectedMediaObjectKey, setSelectedMediaObjectKey] = useState<string | null | undefined>(content.object_key);
  const [isLoadingMediaDetails, setIsLoadingMediaDetails] = useState(false); // For fetching details if only ID is present

  const [mediaLibrary, setMediaLibrary] = useState<Media[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [supabase] = useState(() => createBrowserClient());

  // Effect to fetch media details (like object_key) if only media_id is present in content
  useEffect(() => {
    if (content.media_id && !content.object_key) {
      const fetchMediaDetails = async () => {
        setIsLoadingMediaDetails(true);
        try {
          const { data, error } = await supabase
            .from('media')
            .select('id, object_key, description, file_name, width, height, blur_data_url') // Fetch needed fields including width, height and blur_data_url
            .eq('id', content.media_id)
            .single();
          if (data) {
            onChange({ // Update the parent form's content state
              media_id: data.id,
              object_key: data.object_key,
              alt_text: content.alt_text || data.description || data.file_name,
              caption: content.caption || "",
              width: data.width,
              height: data.height,
              blur_data_url: data.blur_data_url,
            });
            setSelectedMediaObjectKey(data.object_key);
          } else {
            console.error("Error fetching selected media details:", error);
            // Handle case where media_id is invalid or item deleted
            onChange({ media_id: content.media_id ?? null, object_key: null, alt_text: "Error: Media not found", caption: "", width: null, height: null, blur_data_url: null });
          }
        } catch (error) {
            console.error("Fatal error fetching media details:", error);
            onChange({ media_id: content.media_id ?? null, object_key: null, alt_text: "Error: Could not fetch media", caption: "", width: null, height: null, blur_data_url: null });
        } finally {
            setIsLoadingMediaDetails(false);
        }
      };
      fetchMediaDetails();
    } else if (content.object_key) {
        setSelectedMediaObjectKey(content.object_key);
    } else {
        setSelectedMediaObjectKey(null);
    }
  }, [content.media_id, content.object_key, content.alt_text, content.caption, supabase, onChange]);


  useEffect(() => {
    if (isModalOpen) {
      const fetchLibrary = async () => {
        setIsLoadingLibrary(true);
        try {
            let query = supabase.from('media').select('*').order('created_at', { ascending: false }).limit(20);
            if (searchTerm) {
              query = query.ilike('file_name', `%${searchTerm}%`);
            }
            const { data, error } = await query;
            if (data) {
                setMediaLibrary(data);
            } else {
                console.error("Error fetching media library:", error);
                setMediaLibrary([]); // Clear library on error
            }
        } catch (error) {
            console.error("Fatal error fetching media library:", error);
            setMediaLibrary([]); // Clear library on error
        } finally {
            setIsLoadingLibrary(false);
        }
      };
      fetchLibrary();
    }
  }, [isModalOpen, searchTerm, supabase]);

  const handleSelectMediaFromLibrary = (mediaItem: Media) => {
    setSelectedMediaObjectKey(mediaItem.object_key);
    onChange({
      media_id: mediaItem.id,
      object_key: mediaItem.object_key, // Store the object_key
      alt_text: content.alt_text || mediaItem.description || mediaItem.file_name,
      caption: content.caption || "",
      width: mediaItem.width,
      height: mediaItem.height,
      blur_data_url: mediaItem.blur_data_url,
    });
    setIsModalOpen(false);
  };

  const handleAltTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...content,
      media_id: content.media_id || null,
      object_key: selectedMediaObjectKey,
      alt_text: event.target.value,
      width: content.width,
      height: content.height,
      blur_data_url: content.blur_data_url
    });
  };

  const handleCaptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...content,
      media_id: content.media_id || null,
      object_key: selectedMediaObjectKey,
      caption: event.target.value,
      width: content.width,
      height: content.height,
      blur_data_url: content.blur_data_url
    });
  };

  const handleRemoveImage = () => {
    setSelectedMediaObjectKey(null);
    onChange({ media_id: null, object_key: null, alt_text: "", caption: "", width: null, height: null, blur_data_url: null });
  };

  const displayObjectKey = content.object_key || selectedMediaObjectKey;

  return (
    <div className="space-y-3 p-3 border-t mt-2">
      <Label>Image</Label>
      <div className="mt-1 p-3 border rounded-md bg-muted/30 min-h-[120px] flex flex-col items-center justify-center">
        {isLoadingMediaDetails && <p>Loading image details...</p>}
        {!isLoadingMediaDetails && displayObjectKey && typeof content.width === 'number' && typeof content.height === 'number' && content.width > 0 && content.height > 0 ? (
          <div className="relative group inline-block" style={{ maxWidth: content.width, maxHeight: 200 }}> {/* Max height for editor preview consistency */}
            <Image
              src={`${R2_BASE_URL}/${displayObjectKey}`}
              alt={content.alt_text || "Selected image"}
              width={content.width}
              height={content.height}
              className="rounded-md object-contain" // Removed max-h-40, relying on width/height and parent max-height
              style={{ maxHeight: '200px' }} // Ensure image does not exceed this height in preview
              placeholder={content.blur_data_url ? "blur" : "empty"}
              blurDataURL={content.blur_data_url || undefined}
            />
            <Button
              type="button" variant="destructive" size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={handleRemoveImage} title="Remove Image"
            > <XIcon className="h-3 w-3" /> </Button>
          </div>
        ) : !isLoadingMediaDetails && displayObjectKey ? ( // Fallback if width/height are missing but key exists
          <div className="relative group inline-block">
            <Image
              src={`${R2_BASE_URL}/${displayObjectKey}`}
              alt={content.alt_text || "Selected image"}
              width={300}
              height={200}
              className="rounded-md object-contain max-h-40 block"
              style={{ maxHeight: '200px' }}
            />
             <Button
              type="button" variant="destructive" size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={handleRemoveImage} title="Remove Image"
            > <XIcon className="h-3 w-3" /> </Button>
            <p className="text-xs text-orange-500 mt-1">Preview: Dimensions missing, using fallback.</p>
          </div>
        ) : !isLoadingMediaDetails && content.media_id ? (
            <p className="text-sm text-red-500">Image details (object_key or dimensions) missing for Media ID: {content.media_id}. Try re-selecting.</p>
        ) : (
          <ImageIcon className="h-16 w-16 text-muted-foreground" />
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="mt-3">
              {displayObjectKey ? "Change Image" : "Select from Library"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Select or Upload Image</DialogTitle></DialogHeader>
            
            {/* Upload Form Section */}
            <div className="p-1"> {/* Reduced padding for the form wrapper */}
              <MediaUploadForm
                returnJustData={true}
                onUploadSuccess={(newMedia) => {
                  // Add to local library for immediate visibility (optional, but good UX)
                  setMediaLibrary(prev => [newMedia, ...prev.filter(m => m.id !== newMedia.id)]);
                  // Select the newly uploaded media for the block
                  handleSelectMediaFromLibrary(newMedia);
                  // The modal will be closed by handleSelectMediaFromLibrary
                }}
              />
            </div>

            <Separator className="my-4" />

            {/* Media Library Section */}
            <div className="flex flex-col flex-grow overflow-hidden">
              <h3 className="text-lg font-medium mb-3 text-center">Or Select from Library</h3>
              <div className="relative mb-2">
                  <Input type="search" placeholder="Search library..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              </div>
              {isLoadingLibrary ? <div className="flex-grow flex items-center justify-center"><p>Loading media...</p></div>
              : mediaLibrary.length === 0 ? <div className="flex-grow flex items-center justify-center"><p>No media found in library.</p></div>
              : (
                <div className="flex flex-wrap gap-3 overflow-y-auto min-h-0 pr-2 pb-2">
                  {mediaLibrary.filter(m => m.file_type?.startsWith("image/")).map((media) => {
                    if (typeof media.width !== 'number' || typeof media.height !== 'number' || media.width <= 0 || media.height <= 0) {
                      return (
                        <div key={media.id} className="relative aspect-square border rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground p-1 text-center">
                          Image has invalid dimensions
                        </div>
                      );
                    }
                    return (
                      <button key={media.id} type="button"
                        className="relative aspect-square border rounded-md overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary min-w-0 w-1/3 sm:w-1/4 md:w-1/5 lg:w-1/6"
                        onClick={() => handleSelectMediaFromLibrary(media)} >
                        <Image
                          src={`${R2_BASE_URL}/${media.object_key}`}
                          alt={media.description || media.file_name || "Media library image"}
                          width={media.width}
                          height={media.height}
                          className="absolute inset-0 w-full h-full object-cover"
                          placeholder={media.blur_data_url ? "blur" : "empty"}
                          blurDataURL={media.blur_data_url || undefined}
                          sizes="(max-width: 639px) 33vw, (max-width: 767px) 25vw, (max-width: 1023px) 20vw, 17vw"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-white" /></div>
                        <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate text-center">{media.file_name}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter className="mt-auto pt-4"> {/* Ensure footer is at the bottom */}
                <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Label htmlFor={`image-alt-${content.media_id || 'new'}`}>Alt Text</Label>
        <Input id={`image-alt-${content.media_id || 'new'}`} value={content.alt_text || ""} onChange={handleAltTextChange} className="mt-1" disabled={!displayObjectKey} />
      </div>
      <div>
        <Label htmlFor={`image-caption-${content.media_id || 'new'}`}>Caption</Label>
        <Input id={`image-caption-${content.media_id || 'new'}`} value={content.caption || ""} onChange={handleCaptionChange} className="mt-1" disabled={!displayObjectKey} />
      </div>
    </div>
  );
}