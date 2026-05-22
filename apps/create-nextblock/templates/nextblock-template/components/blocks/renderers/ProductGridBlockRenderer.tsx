import React from 'react';
import { ProductGridBlock } from '../../../lib/blocks/ProductGridBlock';
import type { ProductGridBlockContent } from '../../../lib/blocks/ecommerce-block-schemas';
import type { VisualEditAttributes } from '../../../lib/visual-editing/types';

interface ProductGridBlockRendererProps {
  content: ProductGridBlockContent;
  languageId: number;
  excludeProductId?: string;
  excludeTranslationGroupId?: string | null;
  visualEditAttributes?: VisualEditAttributes;
}

export default function ProductGridBlockRenderer({ 
  content, 
  languageId,
  excludeProductId,
  excludeTranslationGroupId,
  visualEditAttributes,
}: ProductGridBlockRendererProps) {
  return (
    <div {...visualEditAttributes}>
      <ProductGridBlock
        content={content}
        languageId={languageId}
        excludeProductId={excludeProductId}
        excludeTranslationGroupId={excludeTranslationGroupId}
      />
    </div>
  );
}
