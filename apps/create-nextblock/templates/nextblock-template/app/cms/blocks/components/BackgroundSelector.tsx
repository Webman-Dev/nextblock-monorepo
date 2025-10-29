// app/cms/blocks/components/BackgroundSelector.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Label, Select, SelectTrigger, SelectContent, SelectItem, SelectValue, Button, Input, Checkbox } from "@nextblock-cms/ui";
import { CustomSelectWithInput, ColorPicker } from "@nextblock-cms/ui";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ImageIcon, X as XIcon, Save } from "lucide-react";
import { cn } from "@nextblock-cms/utils";
import type { Database } from "@nextblock-cms/db";
import type { SectionBlockContent } from "@/lib/blocks/blockRegistry";
import MediaPickerDialog from "@/app/cms/media/components/MediaPickerDialog";

type Media = Database["public"]["Tables"]["media"]["Row"];

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

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

  const handleBackgroundPropertyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...background, [name]: value });
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

  const hasMinHeightChanged = (background?.min_height || "") !== minHeight;
  const imageSizeClass = selectedImage?.size === "contain" ? "object-contain" : "object-cover";
  const hasOverlayDirectionChanged = (selectedImage?.overlay?.gradient?.direction || "to bottom") !== overlayDirection;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label>Background Type</Label>
          <Select value={backgroundType} onValueChange={(v) => handleTypeChange(v as any)}>
            <SelectTrigger className="w-full max-w-[250px]"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
              <SelectItem value="image">Image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="min_height">Minimum Height (e.g., 250px)</Label>
          <div className="flex items-center gap-2">
            <Input id="min_height" name="min_height" value={minHeight} onChange={(e) => setMinHeight(e.target.value)} placeholder="e.g., 250px" className="max-w-[200px]" />
            <Button type="button" variant="ghost" size="icon" onClick={() => handleBackgroundPropertyChange({ target: { name: "min_height", value: minHeight } } as any)} disabled={!hasMinHeightChanged} title="Save Minimum Height">
              <Save className={cn("h-5 w-5", hasMinHeightChanged && "text-green-600")} />
            </Button>
          </div>
        </div>

        {backgroundType === "image" && (
          <>
            <div className="mt-3 p-3 border rounded-md bg-muted/30 min-h-[120px] flex flex-col items-center justify-center">
              {selectedImage?.object_key ? (
                <div className="relative group w-full" style={{ height: background?.min_height || "250px", overflow: "hidden" }}>
                  <Image src={`${R2_BASE_URL}/${selectedImage.object_key}`} alt="Selected background image" width={selectedImage.width || 500} height={selectedImage.height || 300} sizes="100vw" className={`w-full h-full ${imageSizeClass}`} style={{ objectPosition: selectedImage.position }} />
                  {selectedImage.overlay && (
                    <div className="absolute inset-0" style={{ background: generateGradientCss(selectedImage.overlay.gradient) }} />
                  )}
                  <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6" onClick={handleRemoveImage} title="Remove Image">
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              )}

              <div className="mt-3">
                <MediaPickerDialog
                  triggerLabel={selectedImage?.object_key ? "Change Image" : "Select from Library"}
                  onSelect={handleSelectMediaFromLibrary}
                  accept={(m) => !!m.file_type?.startsWith("image/")}
                  title="Select or Upload Background Image"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Image Size</Label>
              <Select value={selectedImage?.size || "cover"} onValueChange={(v) => handleImagePropertyChange("size", v)}>
                <SelectTrigger className="w-full max-w-[250px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Image Position</Label>
              <Select value={imagePosition} onValueChange={(v) => { setImagePosition(v); handleImagePropertyChange("position", v); }}>
                <SelectTrigger className="w-full max-w-[250px]"><SelectValue /></SelectTrigger>
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

            <div className="flex items-center space-x-2 mt-2">
              <Checkbox id="gradientOverlay" checked={!!selectedImage?.overlay} onCheckedChange={(c) => handleOverlayToggle(!!c)} />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="gradientOverlay" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Add Gradient Overlay</label>
              </div>
            </div>

            {selectedImage?.overlay && (
              <div className="mt-3 p-3 border rounded-md bg-muted/30 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-grow">
                    <CustomSelectWithInput
                      label="Direction"
                      tooltipContent="Select a preset or enter a custom angle like '45deg' or 'to top left'. See MDN's linear-gradient docs for more options."
                      value={overlayDirection}
                      onChange={setOverlayDirection}
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
                  <Button size="icon" variant="ghost" onClick={() => handleOverlayGradientChange({ target: { name: "direction", value: overlayDirection } } as any)} disabled={!hasOverlayDirectionChanged} title="Save Overlay Direction">
                    <Save className={cn("h-5 w-5 mt-[1.3rem]", hasOverlayDirectionChanged && "text-green-600")} />
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <ColorPicker
                    label="Start Color"
                    color={selectedImage.overlay.gradient?.stops?.[0]?.color || "rgba(0,0,0,0.5)"}
                    onChange={(color) => handleOverlayGradientChange({ target: { name: "startColor", value: color } } as any)}
                  />
                  <ColorPicker
                    label="End Color"
                    color={selectedImage.overlay.gradient?.stops?.[1]?.color || "rgba(0,0,0,0)"}
                    onChange={(color) => handleOverlayGradientChange({ target: { name: "endColor", value: color } } as any)}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {backgroundType === "gradient" && (
          <div className="mt-3 p-3 border rounded-md bg-muted/30 space-y-4">
            <div>
              <CustomSelectWithInput
                label="Direction"
                tooltipContent="Select a preset or enter a custom angle like '45deg' or 'to top left'. See MDN's linear-gradient docs for more options."
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
            <div className="flex items-center gap-4">
              <ColorPicker
                label="Start Color"
                color={background.gradient?.stops?.[0]?.color || "#3b82f6"}
                onChange={(color) => handleBackgroundGradientChange({ target: { name: "startColor", value: color } } as any)}
              />
              <ColorPicker
                label="End Color"
                color={background.gradient?.stops?.[1]?.color || "#8b5cf6"}
                onChange={(color) => handleBackgroundGradientChange({ target: { name: "endColor", value: color } } as any)}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
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
}
