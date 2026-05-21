'use client';

import React from 'react';
import { ProductDetailsLayout } from '@nextblock-cms/ecommerce/components/ProductDetailsLayout';
import type { VisualEditAttributes } from '../../../lib/visual-editing/types';

interface ProductDetailsBlockRendererProps {
  visualEditAttributes?: VisualEditAttributes;
  productVisualEditingEnabled?: boolean;
}

export default function ProductDetailsBlockRenderer({
  visualEditAttributes,
  productVisualEditingEnabled = false,
}: ProductDetailsBlockRendererProps) {
  return (
    <div {...visualEditAttributes}>
      <ProductDetailsLayout visualEditingEnabled={productVisualEditingEnabled} />
    </div>
  );
}
