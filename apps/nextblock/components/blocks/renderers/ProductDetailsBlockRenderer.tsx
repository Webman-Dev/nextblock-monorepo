import React from 'react';
import { ProductDetailsLayout } from '@nextblock-cms/ecommerce/components/ProductDetailsLayout';
import type { VisualEditAttributes, VisualEditingDocumentContext } from '../../../lib/visual-editing/types';
import { createClient } from "@nextblock-cms/db/server";
import BlockRenderer from "../../BlockRenderer";
import ProductReviewsSection from "../../ProductReviewsSection";

interface ProductDetailsBlockRendererProps {
  visualEditAttributes?: VisualEditAttributes;
  productVisualEditingEnabled?: boolean;
  excludeProductId?: string;
  languageId: number;
  visualEditing?: VisualEditingDocumentContext;
}

export default async function ProductDetailsBlockRenderer({
  visualEditAttributes,
  productVisualEditingEnabled = false,
  excludeProductId,
  languageId,
  visualEditing,
}: ProductDetailsBlockRendererProps) {
  const supabase = createClient();
  
  let descriptionBlocks: any[] = [];
  let productSlug = "";
  let productDraftId: number | null = null;
  
  if (excludeProductId) {
    const { data: productInfo } = await supabase
      .from('products')
      .select('slug')
      .eq('id', excludeProductId)
      .maybeSingle();

    if (productInfo) {
      productSlug = productInfo.slug;
    }

    if (productVisualEditingEnabled) {
      const { data: draftData } = await supabase
        .from('product_drafts')
        .select('id, blocks')
        .eq('product_id', excludeProductId)
        .maybeSingle();
        
      if (draftData) {
        productDraftId = draftData.id;
        if (draftData.blocks && Array.isArray(draftData.blocks)) {
          descriptionBlocks = draftData.blocks;
        }
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

  const productDescriptionVisualEditing = {
    enabled: productVisualEditingEnabled,
    documentType: "product" as const,
    documentId: excludeProductId!,
    slug: productSlug,
    languageId: languageId,
    draftId: productDraftId,
  };

  const descriptionNode = descriptionBlocks.length > 0 ? (
    <BlockRenderer 
      blocks={descriptionBlocks} 
      languageId={languageId} 
      productVisualEditingEnabled={productVisualEditingEnabled}
      visualEditing={productDescriptionVisualEditing}
    />
  ) : undefined;

  return (
    <div {...visualEditAttributes}>
      <ProductDetailsLayout 
        visualEditingEnabled={productVisualEditingEnabled} 
        descriptionNode={descriptionNode}
        reviewsNode={excludeProductId ? <ProductReviewsSection productId={excludeProductId} /> : undefined}
      />
    </div>
  );
}
