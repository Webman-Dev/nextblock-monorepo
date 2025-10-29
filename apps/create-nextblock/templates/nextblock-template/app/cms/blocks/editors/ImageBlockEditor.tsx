// app/cms/blocks/editors/ImageBlockEditor.tsx
"use client";

import React, { useState } from 'react'; // Removed useTransition as it's not used here
import Image from 'next/image';
import { Label } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { Button } from "@nextblock-cms/ui";
import type { Database } from "@nextblock-cms/db";

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
import { ImageIcon, X as XIcon } from 'lucide-react';
import MediaPickerDialog from "@/app/cms/media/components/MediaPickerDialog"; // Import the upload form
import { BlockEditorProps } from '../components/BlockEditorModal';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

export default function ImageBlockEditor({ content, onChange }: BlockEditorProps<Partial<ImageBlockContent>>) {
  const [selectedMediaObjectKey, setSelectedMediaObjectKey] = useState<string | null | undefined>(content.object_key);
  const [isLoadingMediaDetails] = useState(false); // For fetching details if only ID is present


  // Effect to fetch media details (like object_key) if only media_id is present in content
  

  const handleSelectMediaFromLibrary = (mediaItem: Media) => {
    // Always reset alt to the new media's description (or derived from filename)
    const deriveAltFromFilename = (name: string) => {
      const lastDot = name.lastIndexOf('.');
      const base = lastDot > 0 ? name.substring(0, lastDot) : name;
      const spaced = base.replace(/[-+_\\]+/g, ' ').replace(/\s+/g, ' ').trim();
      return spaced.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
    };
    const newAlt = mediaItem.description && mediaItem.description.trim().length > 0
      ? mediaItem.description
      : deriveAltFromFilename(mediaItem.file_name || 'Image');

    setSelectedMediaObjectKey(mediaItem.object_key);
    onChange({
      media_id: mediaItem.id,
      object_key: mediaItem.object_key,
      alt_text: newAlt, // overwrite alt when image changes
      caption: content.caption || "",
      width: mediaItem.width,
      height: mediaItem.height,
      blur_data_url: mediaItem.blur_data_url,
    });
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

        <MediaPickerDialog triggerLabel={displayObjectKey ? "Change Image" : "Select from Library"} onSelect={handleSelectMediaFromLibrary} accept={(m)=>!!m.file_type?.startsWith("image/")} title="Select or Upload Image" />
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

