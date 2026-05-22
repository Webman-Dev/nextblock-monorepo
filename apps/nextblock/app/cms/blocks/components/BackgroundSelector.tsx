// app/cms/blocks/components/BackgroundSelector.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Label, Select, SelectTrigger, SelectContent, SelectItem, SelectValue, Button, Input, Checkbox } from "@nextblock-cms/ui";
import { CustomSelectWithInput, ColorPicker } from "@nextblock-cms/ui";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Trash } from "lucide-react";
import type { Database } from "@nextblock-cms/db";
import { SectionBlockContent } from '../../../../lib/blocks/blockRegistry';
import MediaPickerDialog from "../../media/components/MediaPickerDialog";
import { resolveMediaUrl } from "../../../../lib/media/resolveMediaUrl";

type Media = Database["public"]["Tables"]["media"]["Row"];

interface BackgroundSelectorProps {
  background: SectionBlockContent["background"];
  onChange: (newBackground: SectionBlockContent["background"]) => void;
}

export default function BackgroundSelector({ background, onChange }: BackgroundSelectorProps) {

  const backgroundType = background?.type || "none";
  const selectedImage = background?.type === "image" ? background.image : undefined;
  const [minHeight, setMinHeight] = useState(background?.min_height || "");
  const [imagePosition, setImagePosition] = useState<string>(selectedImage?.position || "center");
  const [overlayDirection, setOverlayDirection] = useState(selectedImage?.overlay?.gradient?.direction || "to bottom");

  useEffect(() => {
    setMinHeight(background?.min_height || "");
  }, [background?.min_height]);

  useEffect(() => {
    setImagePosition(selectedImage?.position || "center");
    setOverlayDirection(selectedImage?.overlay?.gradient?.direction || "to bottom");
  }, [selectedImage?.position, selectedImage?.overlay?.gradient?.direction]);

  const generateGradientCss = (gradient: { direction?: string; stops?: Array<{ color: string; position: number }> }) => {
    if (!gradient || !gradient.stops || gradient.stops.length === 0) return "none";
    const direction = gradient.direction || "to bottom";
    const stops = gradient.stops.map((s) => `${s.color} ${s.position}%`).join(", ");
    return `linear-gradient(${direction}, ${stops})`;
  };

  const handleTypeChange = (type: SectionBlockContent["background"]["type"]) => {
    if (type === "image") {
      onChange({
        type: "image",
        image: {
          media_id: "",
          object_key: "",
          size: "cover",
          position: "center",
          overlay: undefined,
        },
      });
    } else if (type === "gradient") {
      onChange({
        type: "gradient",
        gradient: {
          type: "linear",
          direction: "to right",
          stops: [
            { color: "#3b82f6", position: 0 },
            { color: "#8b5cf6", position: 100 },
          ],
        },
      });
    } else {
      onChange({ type });
    }
  };

  const handleSelectMediaFromLibrary = (mediaItem: Media) => {
    onChange({
      type: "image",
      image: {
        ...selectedImage,
        media_id: mediaItem.id,
        object_key: mediaItem.object_key,
        width: mediaItem.width ?? undefined,
        height: mediaItem.height ?? undefined,
        size: selectedImage?.size || "cover",
        position: selectedImage?.position || "center",
      },
    });
  };

  const handleRemoveImage = () => {
    onChange({
      type: "image",
      image: {
        media_id: "",
        object_key: "",
        size: "cover",
        position: "center",
        overlay: undefined,
      },
    });
  };

  const handleImagePropertyChange = (prop: "size" | "position", value: string) => {
    if (background?.type === "image" && background.image) {
      onChange({ ...background, image: { ...background.image, [prop]: value } });
    }
  };

  const handleOverlayToggle = (checked: boolean) => {
    if (background?.type === "image" && background.image) {
      const newOverlay = checked
        ? {
            type: "gradient" as const,
            gradient: {
              type: "linear" as const,
              direction: "to bottom",
              stops: [
                { color: "rgba(0,0,0,0.5)", position: 0 },
                { color: "rgba(0,0,0,0)", position: 100 },
              ],
            },
          }
        : undefined;
      onChange({ ...background, image: { ...background.image, overlay: newOverlay } });
    }
  };

  const handleOverlayGradientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (background?.type === "image" && background.image) {
      const { image } = background;
      const overlay = image.overlay;
      const currentGradient = overlay?.gradient || {
        type: "linear" as const,
        direction: "to bottom",
        stops: [
          { color: "rgba(0,0,0,0.5)", position: 0 },
          { color: "rgba(0,0,0,0)", position: 100 },
        ],
      };

      const updatedStops = currentGradient.stops.map((stop) => {
        if (name === "startColor" && stop.position === 0) return { ...stop, color: value };
        if (name === "endColor" && stop.position === 100) return { ...stop, color: value };
        return stop;
      });

      const updatedGradient =
        name === "direction"
          ? { ...currentGradient, direction: value }
          : { ...currentGradient, stops: updatedStops };

      onChange({ ...background, image: { ...image, overlay: { type: "gradient", gradient: updatedGradient } } });
    }
  };

  const handleBackgroundGradientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as any;
    if (backgroundType !== 'gradient') return;
    const current = background.gradient || { type: 'linear' as const, direction: 'to right', stops: [ { color: '#3b82f6', position: 0 }, { color: '#8b5cf6', position: 100 } ] };
    if (name === 'direction') {
      onChange({ type: 'gradient', gradient: { ...current, direction: value } });
      return;
    }
    if (name === 'startColor' || name === 'endColor') {
      const updatedStops = (current.stops || [ { color: '#3b82f6', position: 0 }, { color: '#8b5cf6', position: 100 } ]).map((s) => {
        if (name === 'startColor' && s.position === 0) return { ...s, color: value };
        if (name === 'endColor' && s.position === 100) return { ...s, color: value };
        return s;
      });
      onChange({ type: 'gradient', gradient: { ...current, stops: updatedStops } });
    }
  };

  const selectedImageUrl = resolveMediaUrl(selectedImage?.object_key);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-end gap-3.5 pt-1">
        {/* Background Type */}
        <div className="space-y-1.5 w-[140px]">
          <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none">Background Type</Label>
          <Select value={backgroundType} onValueChange={(v) => handleTypeChange(v as any)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
              <SelectItem value="image">Image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Minimum Height */}
        <div className="space-y-1.5 w-[110px]">
          <Label htmlFor="min_height" className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none">Min Height</Label>
          <Input
            id="min_height"
            name="min_height"
            value={minHeight}
            onChange={(e) => setMinHeight(e.target.value)}
            onBlur={() => {
              onChange({ ...background, min_height: minHeight });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            placeholder="e.g., 250px"
            className="h-9 text-sm"
          />
        </div>

        {/* Gradient Background configuration (rendered inline) */}
        {backgroundType === "gradient" && (
          <>
            <div className="w-[200px]">
              <CustomSelectWithInput
                label="Gradient Direction"
                tooltipContent="Select a preset or enter a custom angle like '45deg' or 'to top left'."
                value={background.gradient?.direction || "to right"}
                onChange={(value: string) => handleBackgroundGradientChange({ target: { name: "direction", value } } as any)}
                options={[
                  { value: "to right", label: "To Right" },
                  { value: "to left", label: "To Left" },
                  { value: "to top", label: "To Top" },
                  { value: "to bottom", label: "To Bottom" },
                  { value: "to bottom right", label: "To Bottom Right" },
                  { value: "to top left", label: "To Top Left" },
                ]}
              />
            </div>
            <div className="w-[150px]">
              <ColorPicker
                label="Start Color"
                color={background.gradient?.stops?.[0]?.color || "#3b82f6"}
                onChange={(color) => handleBackgroundGradientChange({ target: { name: "startColor", value: color } } as any)}
              />
            </div>
            <div className="w-[150px]">
              <ColorPicker
                label="End Color"
                color={background.gradient?.stops?.[1]?.color || "#8b5cf6"}
                onChange={(color) => handleBackgroundGradientChange({ target: { name: "endColor", value: color } } as any)}
              />
            </div>
          </>
        )}

        {/* Image Size (only if image type) */}
        {backgroundType === "image" && (
          <div className="space-y-1.5 w-[110px]">
            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none">Image Size</Label>
            <Select value={selectedImage?.size || "cover"} onValueChange={(v) => handleImagePropertyChange("size", v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Image Position (only if image type) */}
        {backgroundType === "image" && (
          <div className="space-y-1.5 w-[130px]">
            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none">Image Position</Label>
            <Select value={imagePosition} onValueChange={(v) => { setImagePosition(v); handleImagePropertyChange("position", v); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="top left">Top Left</SelectItem>
                <SelectItem value="top right">Top Right</SelectItem>
                <SelectItem value="bottom left">Bottom Left</SelectItem>
                <SelectItem value="bottom right">Bottom Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Image Picker Trigger / Thumbnail */}
        {backgroundType === "image" && (
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none">Image</Label>
            {selectedImage?.object_key ? (
              <div className="flex items-center gap-2 h-9">
                <div className="relative w-9 h-9 rounded border bg-muted overflow-hidden flex-shrink-0 shadow-sm">
                  {selectedImageUrl ? (
                    <Image
                      src={selectedImageUrl}
                      alt="Thumbnail"
                      fill
                      sizes="36px"
                      className="object-cover"
                      style={{ objectPosition: selectedImage.position }}
                    />
                  ) : null}
                  {selectedImage.overlay && (
                    <div className="absolute inset-0" style={{ background: generateGradientCss(selectedImage.overlay.gradient) }} />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <MediaPickerDialog
                    triggerLabel="Change"
                    triggerVariant="outline"
                    onSelect={handleSelectMediaFromLibrary}
                    accept={(m) => !!m.file_type?.startsWith("image/")}
                    title="Select Background Image"
                  >
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2.5 text-xs">
                      Change
                    </Button>
                  </MediaPickerDialog>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                    onClick={handleRemoveImage}
                    title="Remove Image"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-9 flex items-center">
                <MediaPickerDialog
                  triggerLabel="Select Image"
                  triggerVariant="outline"
                  onSelect={handleSelectMediaFromLibrary}
                  accept={(m) => !!m.file_type?.startsWith("image/")}
                  title="Select Background Image"
                >
                  <Button type="button" variant="outline" size="sm" className="h-9 px-3 text-xs">
                    Select Image
                  </Button>
                </MediaPickerDialog>
              </div>
            )}
          </div>
        )}

        {/* Overlay Checkbox */}
        {backgroundType === "image" && selectedImage?.object_key && (
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none">Overlay</Label>
            <div className="flex items-center justify-center h-9 border border-input rounded-md px-3 bg-background">
              <Checkbox
                id="gradientOverlay"
                checked={!!selectedImage?.overlay}
                onCheckedChange={(c) => handleOverlayToggle(!!c)}
              />
            </div>
          </div>
        )}

        {/* Gradient Overlay configuration fields (inline) */}
        {backgroundType === "image" && selectedImage?.overlay && (
          <>
            <div className="w-[200px]">
              <CustomSelectWithInput
                label="Overlay Direction"
                tooltipContent="Select a preset or enter a custom angle like '45deg' or 'to top left'."
                value={overlayDirection}
                onChange={(val) => {
                  setOverlayDirection(val);
                  handleOverlayGradientChange({ target: { name: "direction", value: val } } as any);
                }}
                options={[
                  { value: "to bottom", label: "To Bottom" },
                  { value: "to top", label: "To Top" },
                  { value: "to left", label: "To Left" },
                  { value: "to right", label: "To Right" },
                  { value: "to bottom right", label: "To Bottom Right" },
                  { value: "to top left", label: "To Top Left" },
                ]}
              />
            </div>
            <div className="w-[150px]">
              <ColorPicker
                label="Overlay Start"
                color={selectedImage.overlay.gradient?.stops?.[0]?.color || "rgba(0,0,0,0.5)"}
                onChange={(color) => handleOverlayGradientChange({ target: { name: "startColor", value: color } } as any)}
              />
            </div>
            <div className="w-[150px]">
              <ColorPicker
                label="Overlay End"
                color={selectedImage.overlay.gradient?.stops?.[1]?.color || "rgba(0,0,0,0)"}
                onChange={(color) => handleOverlayGradientChange({ target: { name: "endColor", value: color } } as any)}
              />
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
