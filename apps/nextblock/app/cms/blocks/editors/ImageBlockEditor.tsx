// app/cms/blocks/editors/ImageBlockEditor.tsx
"use client";

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { Label } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { Button } from "@nextblock-cms/ui";
import type { Database } from "@nextblock-cms/db";

type Media = Database['public']['Tables']['media']['Row'];
export type ImageBlockContent = {
    media_id: string | null;
    object_key: string | null;
    external_url?: string | null;
    alt_text: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
    blur_data_url: string | null;
};
import { ImageIcon, X as XIcon, Link as LinkIcon, DownloadCloud } from 'lucide-react';
import MediaPickerDialog from "../../media/components/MediaPickerDialog";
import { BlockEditorProps } from '../components/BlockEditorModal';
import { resolveMediaUrl } from '../../../../lib/media/resolveMediaUrl';
import { importExternalImageToMedia } from "../../media/import-external-image";

const deriveAltFromFilename = (name: string) => {
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.substring(0, lastDot) : name;
  const spaced = base.replace(/[-+_\\]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
};

export default function ImageBlockEditor({ content, onChange }: BlockEditorProps<Partial<ImageBlockContent>>) {
  const [selectedMediaObjectKey, setSelectedMediaObjectKey] = useState<string | null | undefined>(content.object_key);
  const [externalUrlInput, setExternalUrlInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, startImport] = useTransition();

  const handleSelectMediaFromLibrary = (mediaItem: Media) => {
    const newAlt = mediaItem.description && mediaItem.description.trim().length > 0
      ? mediaItem.description
      : deriveAltFromFilename(mediaItem.file_name || 'Image');

    setSelectedMediaObjectKey(mediaItem.object_key);
    setImportError(null);
    onChange({
      media_id: mediaItem.id,
      object_key: mediaItem.object_key,
      external_url: null,
      alt_text: newAlt,
      caption: content.caption || "",
      width: mediaItem.width,
      height: mediaItem.height,
      blur_data_url: mediaItem.blur_data_url,
    });
  };

  const handleUseExternalUrl = () => {
    const url = externalUrlInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      setImportError("Enter a valid http(s) image URL.");
      return;
    }
    setImportError(null);
    setSelectedMediaObjectKey(null);
    onChange({
      media_id: null,
      object_key: null,
      external_url: url,
      alt_text: content.alt_text || "",
      caption: content.caption || "",
      width: null,
      height: null,
      blur_data_url: null,
    });
    setExternalUrlInput("");
  };

  const handleImportToLibrary = () => {
    if (!content.external_url) return;
    setImportError(null);
    startImport(async () => {
      const result = await importExternalImageToMedia({
        url: content.external_url as string,
        altText: content.alt_text || undefined,
      });
      if ("error" in result) {
        setImportError(result.error);
        return;
      }
      setSelectedMediaObjectKey(result.media.object_key);
      onChange({
        media_id: result.media.id,
        object_key: result.media.object_key,
        external_url: null,
        alt_text: content.alt_text || result.media.alt_text || "",
        caption: content.caption || "",
        width: result.media.width || null,
        height: result.media.height || null,
        blur_data_url: result.media.blur_data_url,
      });
    });
  };

  const handleAltTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...content, object_key: selectedMediaObjectKey, alt_text: event.target.value });
  };

  const handleCaptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...content, object_key: selectedMediaObjectKey, caption: event.target.value });
  };

  const handleRemoveImage = () => {
    setSelectedMediaObjectKey(null);
    setImportError(null);
    onChange({ media_id: null, object_key: null, external_url: null, alt_text: "", caption: "", width: null, height: null, blur_data_url: null });
  };

  const displayObjectKey = content.object_key || selectedMediaObjectKey;
  const displayImageUrl = resolveMediaUrl(displayObjectKey);
  const hasImage = Boolean(displayObjectKey || content.external_url);

  return (
    <div className="space-y-3 p-3 border-t mt-2">
      <Label>Image</Label>
      <div className="mt-1 p-3 border rounded-md bg-muted/30 min-h-[120px] flex flex-col items-center justify-center gap-2">
        {content.external_url ? (
          <div className="relative group inline-block w-full text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.external_url}
              alt={content.alt_text || "External image"}
              className="rounded-md object-contain mx-auto max-h-[200px] max-w-full"
            />
            <Button
              type="button" variant="destructive" size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={handleRemoveImage} title="Remove Image"
            > <XIcon className="h-3 w-3" /> </Button>
            <div className="mt-2 flex items-center justify-center">
              <Button type="button" size="sm" variant="secondary" onClick={handleImportToLibrary} disabled={isImporting}>
                <DownloadCloud className="mr-1.5 h-3.5 w-3.5" />
                {isImporting ? "Saving to library..." : "Save to media library"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              External image placeholder. Save it to your library to make it a permanent, optimized asset.
            </p>
          </div>
        ) : displayImageUrl && typeof content.width === 'number' && typeof content.height === 'number' && content.width > 0 && content.height > 0 ? (
          <div className="relative group inline-block" style={{ maxWidth: content.width, maxHeight: 200 }}>
            <Image
              src={displayImageUrl}
              alt={content.alt_text || "Selected image"}
              width={content.width}
              height={content.height}
              className="rounded-md object-contain"
              style={{ maxHeight: '200px' }}
              placeholder={content.blur_data_url ? "blur" : "empty"}
              blurDataURL={content.blur_data_url || undefined}
            />
            <Button
              type="button" variant="destructive" size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={handleRemoveImage} title="Remove Image"
            > <XIcon className="h-3 w-3" /> </Button>
          </div>
        ) : displayImageUrl ? (
          <div className="relative group inline-block">
            <Image
              src={displayImageUrl}
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
        ) : content.media_id ? (
            <p className="text-sm text-red-500">Image details (object_key or dimensions) missing for Media ID: {content.media_id}. Try re-selecting.</p>
        ) : (
          <ImageIcon className="h-16 w-16 text-muted-foreground" />
        )}

        <MediaPickerDialog triggerLabel={hasImage ? "Change Image" : "Select from Library"} onSelect={handleSelectMediaFromLibrary} accept={(m)=>!!m.file_type?.startsWith("image/")} title="Select or Upload Image" />

        {!content.external_url && (
          <div className="w-full pt-2 mt-1 border-t">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> or paste an image URL
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={externalUrlInput}
                onChange={(e) => setExternalUrlInput(e.target.value)}
                placeholder="https://images.example.com/photo.jpg"
                className="text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleUseExternalUrl} disabled={!externalUrlInput.trim()}>
                Use URL
              </Button>
            </div>
          </div>
        )}

        {importError && <p className="text-xs text-red-500 mt-1 w-full text-center">{importError}</p>}
      </div>

      <div>
        <Label htmlFor={`image-alt-${content.media_id || 'new'}`}>Alt Text</Label>
        <Input id={`image-alt-${content.media_id || 'new'}`} value={content.alt_text || ""} onChange={handleAltTextChange} className="mt-1" disabled={!hasImage} />
      </div>
      <div>
        <Label htmlFor={`image-caption-${content.media_id || 'new'}`}>Caption</Label>
        <Input id={`image-caption-${content.media_id || 'new'}`} value={content.caption || ""} onChange={handleCaptionChange} className="mt-1" disabled={!hasImage} />
      </div>
    </div>
  );
}
