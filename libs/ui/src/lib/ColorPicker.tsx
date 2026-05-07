"use client";

import * as React from "react";
import type { ColorResult, SketchPickerProps } from "react-color";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Label } from "./label";
import { cn } from "@nextblock-cms/utils";

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (newColor: string) => void;
  className?: string;
}

const SketchPicker = React.lazy(async () => {
  const module = await import("react-color");
  return {
    default: module.SketchPicker as React.ComponentType<SketchPickerProps>,
  };
});

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ label, color, onChange, className }, ref) => {
    const handleColorChange = (newColor: ColorResult) => {
      const { r, g, b, a } = newColor.rgb;
      onChange(`rgba(${r}, ${g}, ${b}, ${a})`);
    };

    return (
      <div className={cn("space-y-2", className)} ref={ref}>
        <Label>{label}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <div
              className="w-full h-10 rounded-md border border-input cursor-pointer"
              style={{ backgroundColor: color }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <React.Suspense fallback={<div className="h-[276px] w-[220px]" />}>
              <SketchPicker color={color} onChangeComplete={handleColorChange} />
            </React.Suspense>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

ColorPicker.displayName = "ColorPicker";

export { ColorPicker };
