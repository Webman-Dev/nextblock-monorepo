import React from 'react';
import { ProductGridBlock } from '../../../lib/blocks/ProductGridBlock';
import { ProductGridBlockContent } from '../../../lib/blocks/ecommerce-block-schemas';

interface ProductGridBlockRendererProps {
  content: ProductGridBlockContent;
  languageId: number;
}

export default function ProductGridBlockRenderer({ content }: ProductGridBlockRendererProps) {

  return <ProductGridBlock content={content} />;
}
