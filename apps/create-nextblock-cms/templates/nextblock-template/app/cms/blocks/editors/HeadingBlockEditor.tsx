// app/cms/blocks/editors/HeadingBlockEditor.tsx
"use client";

import React from "react";
import { Label } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nextblock-cms/ui";
import type { HeadingBlockContent } from "@/lib/blocks/blockRegistry";
import { BlockEditorProps } from '../components/BlockEditorModal';

export default function HeadingBlockEditor({ content, onChange }: BlockEditorProps<Partial<HeadingBlockContent>>) {
  const idPrefix = React.useId();

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...content, text_content: event.target.value });
  };

  const handleLevelChange = (value: string) => {
    onChange({ ...content, level: parseInt(value, 10) as HeadingBlockContent['level'] });
  };

  const textAlignOptions = ['left', 'center', 'right', 'justify'] as const;

  const textColorOptions = [
    { value: 'primary', label: 'Primary', swatchClass: 'bg-primary' },
    { value: 'secondary', label: 'Secondary', swatchClass: 'bg-secondary' },
    { value: 'accent', label: 'Accent', swatchClass: 'bg-accent' },
    { value: 'muted', label: 'Muted', swatchClass: 'bg-muted-foreground' }, // Using muted-foreground for swatch as text-muted is for text
    { value: 'destructive', label: 'Destructive', swatchClass: 'bg-destructive' },
    { value: 'background', label: 'Background', swatchClass: 'bg-background' },
  ] as const;

  const handleTextAlignChange = (value: string) => {
    onChange({ ...content, textAlign: value as HeadingBlockContent['textAlign'] });
  };

  const handleTextColorChange = (value: string) => {
    const newTextColor = value === "" ? undefined : value as HeadingBlockContent['textColor'];
    onChange({ ...content, textColor: newTextColor });
  };

  return (
    <div className="space-y-3 p-3 border-t mt-2">
      <div>
        <Label htmlFor={`heading-text-${idPrefix}`}>Heading Text</Label>
        <Input
          id={`heading-text-${idPrefix}`}
          value={content.text_content || ""}
          onChange={handleTextChange}
          placeholder="Enter heading text"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`heading-level-${idPrefix}`}>Level</Label>
        <Select
            value={content.level?.toString() || "2"}
            onValueChange={handleLevelChange}
        >
            <SelectTrigger id={`heading-level-${idPrefix}`} className="mt-1">
                <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
                {[1, 2, 3, 4, 5, 6].map(level => (
                    <SelectItem key={level} value={level.toString()}>H{level}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={`heading-text-align-${idPrefix}`}>Text Alignment</Label>
        <Select
          value={content.textAlign || 'left'}
          onValueChange={handleTextAlignChange}
        >
          <SelectTrigger id={`heading-text-align-${idPrefix}`} className="mt-1">
            <SelectValue placeholder="Select alignment" />
          </SelectTrigger>
          <SelectContent>
            {textAlignOptions.map(align => (
              <SelectItem key={align} value={align}>
                {align.charAt(0).toUpperCase() + align.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={`heading-text-color-${idPrefix}`}>Text Color</Label>
        <Select
          value={content.textColor || ""} // Use empty string if no color is selected initially
          onValueChange={handleTextColorChange}
        >
          <SelectTrigger id={`heading-text-color-${idPrefix}`} className="mt-1">
            <SelectValue placeholder="Select color (optional)" />
          </SelectTrigger>
          <SelectContent>
            {textColorOptions.map(color => (
              <SelectItem key={color.value} value={color.value}>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-sm mr-2 border ${color.swatchClass}`}></div>
                  {color.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}