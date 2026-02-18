"use client";

import { Label, Input } from "@nextblock-cms/ui";
import { BlockEditorProps } from '../components/BlockEditorModal';
import { FeaturedProductBlockContent } from '../../../../lib/blocks/ecommerce-block-schemas';

export default function FeaturedProductBlockEditor({ content, onChange }: BlockEditorProps<Partial<FeaturedProductBlockContent>>) {

  const handleChange = (field: keyof FeaturedProductBlockContent, value: any) => {
    onChange({ ...content, [field]: value });
  };

  return (
    <div className="space-y-4 p-3 border-t mt-2">
      <div>
        <Label htmlFor="fp-id">Product ID (UUID)</Label>
        <Input
          id="fp-id"
          value={content.productId || ""}
          onChange={(e) => handleChange('productId', e.target.value)}
          placeholder="e.g. 123e4567-e89b..."
          className="mt-1"
        />
         <p className="text-xs text-muted-foreground mt-1">
            Copy the Product ID from the Products table.
         </p>
      </div>
      {/* Additional fields like showBackground can be added here */}
    </div>
  );
}
