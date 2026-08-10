// app/cms/blocks/editors/HeadingBlockEditor.tsx
"use client";

import React from "react";
import { Label } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { ColorField } from "@nextblock-cms/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nextblock-cms/ui";
import { HeadingBlockContent } from '../../../../lib/blocks/blockRegistry';
import { TEXT_COLOR_TOKEN_OPTIONS } from '../../../../lib/blocks/blockColors';
import { BlockEditorProps } from '../components/BlockEditorModal';

/** Handy starting points that are not in the theme — brand-neutral and legible. */
const HEADING_COLOR_PRESETS = [
  '#0F172A',
  '#334155',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#0891B2',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
] as const;

export default function HeadingBlockEditor({ content, onChange, sectionBackground }: BlockEditorProps<Partial<HeadingBlockContent>>) {
  const idPrefix = React.useId();

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...content, text_content: event.target.value });
  };

  const handleLevelChange = (value: string) => {
    onChange({ ...content, level: parseInt(value, 10) as HeadingBlockContent['level'] });
  };

  const textAlignOptions = ['left', 'center', 'right', 'justify'] as const;

  const handleTextAlignChange = (value: string) => {
    onChange({ ...content, textAlign: value as HeadingBlockContent['textAlign'] });
  };

  const handleTextColorChange = (value: string | undefined) => {
    onChange({ ...content, textColor: value as HeadingBlockContent['textColor'] });
  };

  // Measure contrast against the real section backdrop when there is one, so the
  // warning reflects what the visitor will actually see.
  const contrastAgainst = React.useMemo(() => {
    if (sectionBackground?.type === 'solid') return sectionBackground.solid_color;
    if (sectionBackground?.type === 'theme' && sectionBackground.theme) {
      return `hsl(var(--${sectionBackground.theme}))`;
    }
    if (!sectionBackground || sectionBackground.type === 'none') return 'hsl(var(--background))';
    // Gradients and images have no single backdrop colour to measure against.
    return undefined;
  }, [sectionBackground]);

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
      <ColorField
        id={`heading-text-color-${idPrefix}`}
        label="Text Color"
        description="Theme colours follow light/dark mode. Custom colours stay fixed."
        value={content.textColor}
        onChange={handleTextColorChange}
        tokens={TEXT_COLOR_TOKEN_OPTIONS}
        presets={HEADING_COLOR_PRESETS}
        contrastAgainst={contrastAgainst}
        largeText
        enableAlpha
        clearLabel="Inherit from theme"
        placeholder="Inherit from theme"
      />
    </div>
  );
}