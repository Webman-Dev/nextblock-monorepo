import React from 'react';
import { FeaturedProductBlock } from '../../../lib/blocks/FeaturedProductBlock';
import { FeaturedProductBlockContent } from '../../../lib/blocks/ecommerce-block-schemas';

interface FeaturedProductBlockRendererProps {
  content: FeaturedProductBlockContent;
  languageId: number;
}

export default function FeaturedProductBlockRenderer({ content }: FeaturedProductBlockRendererProps) {

  return <FeaturedProductBlock content={content} />;
}
