// app/cms/blocks/editors/ButtonBlockEditor.tsx
"use client";

import React from 'react'; // Added React import for JSX
import { Label } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nextblock-cms/ui";
import { BlockEditorProps } from '../components/BlockEditorModal';

export type ButtonBlockContent = {
    text?: string;
    url?: string;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg';
};

const buttonVariants: ButtonBlockContent['variant'][] = ['default', 'outline', 'secondary', 'ghost', 'link'];
const buttonSizes: ButtonBlockContent['size'][] = ['default', 'sm', 'lg'];


export default function ButtonBlockEditor({ content, onChange }: BlockEditorProps<Partial<ButtonBlockContent>>) {

  const handleChange = (field: keyof ButtonBlockContent, value: string) => {
    // Ensure that when variant or size is cleared, it's set to undefined or a valid default, not an empty string if your type doesn't allow it.
    // However, the Select component's onValueChange will provide valid values from the list or an empty string if placeholder is re-selected (which shouldn't happen here).
    onChange({ ...content, [field]: value });
  };

  return (
    <div className="space-y-3 p-3 border-t mt-2">
      <div>
        <Label htmlFor="btn-text">Button Text</Label>
        <Input
          id="btn-text"
          value={content.text || ""}
          onChange={(e) => handleChange('text', e.target.value)}
          placeholder="Learn More"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="btn-url">Button URL</Label>
        <Input
          id="btn-url"
          value={content.url || ""}
          onChange={(e) => handleChange('url', e.target.value)}
          placeholder="/contact-us or https://example.com"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="btn-variant">Variant</Label>
        <Select
          value={content.variant || "default"}
          onValueChange={(val: string) => handleChange('variant', val)}
        >
          <SelectTrigger id="btn-variant" className="mt-1">
            <SelectValue placeholder="Select variant" />
          </SelectTrigger>
          <SelectContent>
            {buttonVariants.filter((v): v is Exclude<ButtonBlockContent['variant'], undefined> => v !== undefined).map(v => (
              <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="btn-size">Size</Label>
        <Select
          value={content.size || "default"}
          onValueChange={(val: string) => handleChange('size', val)}
        >
          <SelectTrigger id="btn-size" className="mt-1">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {buttonSizes.filter((s): s is Exclude<ButtonBlockContent['size'], undefined> => s !== undefined).map(s => (
              <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}