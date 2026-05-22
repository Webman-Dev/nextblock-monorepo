'use client';

import React from 'react';
import { Cart } from '@nextblock-cms/ecommerce/components/Cart';
import type { VisualEditAttributes } from '../../../lib/visual-editing/types';

interface CartBlockRendererProps {
  visualEditAttributes?: VisualEditAttributes;
}

export default function CartBlockRenderer({ visualEditAttributes }: CartBlockRendererProps) {
  return (
    <div {...visualEditAttributes}>
      <Cart />
    </div>
  );
}
