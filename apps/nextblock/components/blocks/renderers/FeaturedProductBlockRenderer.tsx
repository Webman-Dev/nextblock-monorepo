import React from 'react';
import { FeaturedProductBlock } from '../../../lib/blocks/FeaturedProductBlock';
import type { FeaturedProductBlockContent } from '../../../lib/blocks/ecommerce-block-schemas';
import type { VisualEditAttributes } from '../../../lib/visual-editing/types';

interface FeaturedProductBlockRendererProps {
  content: FeaturedProductBlockContent;
  languageId: number;
  visualEditAttributes?: VisualEditAttributes;
}

export default function FeaturedProductBlockRenderer({
  content,
  visualEditAttributes,
}: FeaturedProductBlockRendererProps) {

  return (
    <div {...visualEditAttributes}>
      <FeaturedProductBlock content={content} />
    </div>
  );
}
