import React from 'react';
import { ProductDetailsLayout } from '@nextblock-cms/ecommerce/components/ProductDetailsLayout';
import type { VisualEditAttributes } from '../../../lib/visual-editing/types';
import { createClient } from "@nextblock-cms/db/server";
import BlockRenderer from "../../BlockRenderer";

interface ProductDetailsBlockRendererProps {
  visualEditAttributes?: VisualEditAttributes;
  productVisualEditingEnabled?: boolean;
  excludeProductId?: string;
  languageId: number;
}

export default async function ProductDetailsBlockRenderer({
  visualEditAttributes,
  productVisualEditingEnabled = false,
  excludeProductId,
  languageId,
}: ProductDetailsBlockRendererProps) {
  const supabase = createClient();
  
  let descriptionBlocks: any[] = [];
  
  if (excludeProductId) {
    if (productVisualEditingEnabled) {
      const { data: draftData } = await supabase
        .from('product_drafts')
        .select('blocks')
        .eq('product_id', excludeProductId)
        .maybeSingle();
        
      if (draftData && draftData.blocks && Array.isArray(draftData.blocks)) {
        descriptionBlocks = draftData.blocks;
      }
    }
    
    if (descriptionBlocks.length === 0) {
      const { data: liveBlocks } = await supabase
        .from('blocks')
        .select('*')
        .eq('product_id', excludeProductId)
        .order('order', { ascending: true });
      descriptionBlocks = liveBlocks || [];
    }
  }

  const descriptionNode = descriptionBlocks.length > 0 ? (
    <BlockRenderer 
      blocks={descriptionBlocks} 
      languageId={languageId} 
      productVisualEditingEnabled={productVisualEditingEnabled}
    />
  ) : undefined;

  return (
    <div {...visualEditAttributes}>
      <ProductDetailsLayout 
        visualEditingEnabled={productVisualEditingEnabled} 
        descriptionNode={descriptionNode}
      />
    </div>
  );
}
