"use client";

import React from 'react';
import { Label, Input } from "@nextblock-cms/ui";
import { BlockEditorProps } from '../components/BlockEditorModal';
import { ProductGridBlockContent } from '../../../../lib/blocks/ecommerce-block-schemas';

export default function ProductGridBlockEditor({ content, onChange }: BlockEditorProps<Partial<ProductGridBlockContent>>) {

  const handleChange = (field: keyof ProductGridBlockContent, value: any) => {
    onChange({ ...content, [field]: value });
  };

  return (
    <div className="space-y-4 p-3 border-t mt-2">
      <div>
        <Label htmlFor="pg-limit">Item Limit</Label>
        <Input
          id="pg-limit"
          type="number"
          min={1}
          max={20}
          value={content.limit || 6}
          onChange={(e) => handleChange('limit', parseInt(e.target.value) || 6)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="pg-title">Grid Title (Optional)</Label>
        <Input
          id="pg-title"
          value={content.title || ""}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="New Arrivals"
          className="mt-1"
        />
      </div>
       {/* Type selection could be added here, currently defaulting to 'latest' */}
    </div>
  );
}
