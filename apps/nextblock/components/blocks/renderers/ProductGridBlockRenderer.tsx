import React from 'react';
import { ProductGridBlock } from '../../../lib/blocks/ProductGridBlock';
import { ProductGridBlockContent } from '../../../lib/blocks/ecommerce-block-schemas';

interface ProductGridBlockRendererProps {
  content: ProductGridBlockContent;
  languageId: number;
  excludeProductId?: string;
  excludeTranslationGroupId?: string | null;
}

export default function ProductGridBlockRenderer({ 
  content, 
  languageId,
  excludeProductId,
  excludeTranslationGroupId,
}: ProductGridBlockRendererProps) {
  return (
    <ProductGridBlock 
      content={content} 
      languageId={languageId} 
      excludeProductId={excludeProductId}
      excludeTranslationGroupId={excludeTranslationGroupId}
    />
  );
}
