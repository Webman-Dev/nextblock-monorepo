// app/cms/blocks/editors/ImageBlockEditor.tsx
"use client";

import React, { useRef, useState, useTransition } from 'react';
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
import { ImageIcon, X as XIcon, Link as LinkIcon, DownloadCloud, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import MediaPickerDialog from "../../media/components/MediaPickerDialog";
import { BlockEditorProps } from '../components/BlockEditorModal';
import { resolveMediaUrl } from '../../../../lib/media/resolveMediaUrl';
import { importExternalImageToMedia } from "../../media/import-external-image";
import { useCortexAiActive } from '../../components/CortexAiActiveContext';
import { useCortexAiPageContext } from '../../components/CortexAiPageContext';
import { buildCortexAiRequestHeaders } from '../../../../lib/cortex-ai/sandbox-headers';
import {
  buildAltTextContext,
  toAbsoluteImageUrl,
  UNRESOLVABLE_IMAGE_URL_MESSAGE,
} from '../../../../lib/cortex-ai/alt-text-request';
import {
  altTextImageIdentity,
  resolveAltTextWriteBack,
  STALE_ALT_TEXT_MESSAGE,
} from '../../../../lib/seo/alt-text-write-back';

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

  // Cortex AI is a premium package. Gating the affordance on activation (rather than
  // letting the button 403) is the difference between a feature the operator has not
  // bought and a feature that looks broken.
  const isCortexAiActive = useCortexAiActive();
  const cortexAiPageContext = useCortexAiPageContext();
  const [isGeneratingAltText, setIsGeneratingAltText] = useState(false);
  // Kept separate from `importError` so an alt-text failure never clears — or is cleared
  // by — an unrelated "save to library" failure sitting a few lines above it.
  const [altTextError, setAltTextError] = useState<string | null>(null);

  /**
   * Live mirrors of the two values that describe which image this block holds.
   *
   * The alt-text generation below is the only async write-back in this editor, and it is
   * the only place that must read these AFTER an await. Refs updated during render (the
   * same pattern `RobotsCard` uses for its Ctrl+S handler) give that continuation the
   * current values instead of the ones its closure captured when the button was clicked,
   * which is what stops a slow vision response from overwriting a newer edit.
   */
  const contentRef = useRef(content);
  contentRef.current = content;
  const selectedMediaObjectKeyRef = useRef(selectedMediaObjectKey);
  selectedMediaObjectKeyRef.current = selectedMediaObjectKey;

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

  /**
   * Ask Cortex AI to describe the image currently in this block.
   *
   * Three things about this deserve stating. First, the URL: `resolveMediaUrl()` hands back
   * a RELATIVE `/${objectKey}` whenever `NEXT_PUBLIC_R2_BASE_URL` is unset — which is the
   * default on the native Supabase-storage backend — and the alt-text route cannot use
   * that, because the AI SDK downloads the image server-side and a relative path has no
   * base there. `toAbsoluteImageUrl()` resolves it against the origin the CMS is being
   * served from; if the result still is not http(s) (a blob: preview of an unsaved file,
   * say) we say so inline instead of firing a request guaranteed to fail.
   *
   * Second, the write-back: the generated string goes through the exact same
   * `onChange({ ...content, object_key, alt_text })` call the text input uses. Feature 2
   * requires the value to land in the block's JSONB attributes, and the surest way to
   * guarantee that is to make the AI path indistinguishable from typing — same shape,
   * same key set, same downstream save. A bespoke write here would be a second code path
   * to keep in sync forever, for no gain.
   *
   * Third, staleness. This handler used to close over `content` and finish with
   * `onChange({ ...capturedContent, ... })`, on the assumption that the block it started
   * on would still be the block it finished on. It is not: the vision call takes seconds
   * and the editor stays live throughout, so an author who removes the image or picks a
   * different one mid-flight would have had the deleted image restored, or a new image
   * labelled with the previous image's description — alt text that is confidently wrong
   * and undetectable by the screen-reader user it is written for. The image's identity is
   * therefore captured instead of its content, and the response is discarded unless the
   * block still holds that same image. `resolveAltTextWriteBack` owns that rule so it can
   * be unit-tested; this component cannot be, as the workspace has no DOM test env.
   */
  const handleGenerateAltText = async () => {
    if (!hasImage || isGeneratingAltText) {
      return;
    }

    const sourceUrl = content.external_url || displayImageUrl;
    const imageUrl = toAbsoluteImageUrl(sourceUrl);

    if (!imageUrl) {
      setAltTextError(UNRESOLVABLE_IMAGE_URL_MESSAGE);
      return;
    }

    // Taken before the await, from the same two values the request itself is built from,
    // so "is this still the image we asked about?" is answerable when the reply lands.
    const capturedIdentity = altTextImageIdentity(content, selectedMediaObjectKey);

    setAltTextError(null);
    setIsGeneratingAltText(true);

    try {
      // Context materially improves alt text — "Nicolas at the 2026 harvest" beats "a man
      // in a field" — so we pass whatever is already in hand for free: this block's own
      // caption, and the title of the page or post being edited, which the CMS layout
      // already registers in the Cortex AI page context. Nothing is fetched for this.
      const context = buildAltTextContext(
        content.caption ? `Image caption: ${content.caption}` : null,
        cortexAiPageContext?.pageContext?.title
          ? `Appears on the ${cortexAiPageContext.pageContext.contentType} “${cortexAiPageContext.pageContext.title}”.`
          : null
      );

      const response = await fetch('/api/ai/seo/alt-text', {
        // The route's body schema is a `z.strictObject` of optionals, so an absent field
        // must be omitted rather than sent as null — a null would fail validation outright.
        body: JSON.stringify({
          ...(context ? { context } : {}),
          imageUrl,
        }),
        headers: buildCortexAiRequestHeaders(),
        method: 'POST',
      });

      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok || !payload) {
        const message =
          payload && typeof payload['error'] === 'string'
            ? (payload['error'] as string)
            : 'Cortex AI could not describe this image.';
        throw new Error(message);
      }

      const generated = typeof payload['altText'] === 'string' ? payload['altText'].trim() : '';
      if (!generated) {
        throw new Error('Cortex AI returned an empty description.');
      }

      const currentContent = contentRef.current;
      const currentObjectKey = selectedMediaObjectKeyRef.current;
      const writeBack = resolveAltTextWriteBack({
        capturedIdentity,
        currentContent,
        currentIdentity: altTextImageIdentity(currentContent, currentObjectKey),
        generatedAltText: generated,
        objectKey: currentObjectKey,
      });

      if (!writeBack) {
        // Not thrown: nothing failed. The model answered, the answer is simply about an
        // image this block no longer shows, so it is reported inline and dropped. A toast
        // is skipped for the same reason — this is not an error the operator caused.
        setAltTextError(STALE_ALT_TEXT_MESSAGE);
        return;
      }

      onChange(writeBack);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Cortex AI could not describe this image.';
      setAltTextError(message);
      toast.error(message);
    } finally {
      setIsGeneratingAltText(false);
    }
  };

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
              // width/height auto so the CSS max-height scales both axes and
              // keeps the intrinsic aspect ratio (next/image warns otherwise)
              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '200px' }}
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
              style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
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
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`image-alt-${content.media_id || 'new'}`}>Alt Text</Label>
          {/* Rendered only when the premium package is active, so a non-premium install
              never shows a button that cannot work. */}
          {isCortexAiActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px]"
              onClick={handleGenerateAltText}
              disabled={!hasImage || isGeneratingAltText}
              title={hasImage ? "Describe this image with Cortex AI" : "Select an image first"}
            >
              {isGeneratingAltText ? (
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-amber-500" />
              )}
              {isGeneratingAltText ? "Generating…" : "Generate with AI"}
            </Button>
          )}
        </div>
        <Input id={`image-alt-${content.media_id || 'new'}`} value={content.alt_text || ""} onChange={handleAltTextChange} className="mt-1" disabled={!hasImage} />
        {altTextError && <p className="text-xs text-red-500 mt-1">{altTextError}</p>}
      </div>
      <div>
        <Label htmlFor={`image-caption-${content.media_id || 'new'}`}>Caption</Label>
        <Input id={`image-caption-${content.media_id || 'new'}`} value={content.caption || ""} onChange={handleCaptionChange} className="mt-1" disabled={!hasImage} />
      </div>
    </div>
  );
}
