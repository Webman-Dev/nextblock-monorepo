import React from 'react';
import { Cart } from '@nextblock-cms/ecommerce/components/Cart';
import PaymentReadinessBoundary from '../../commerce/PaymentReadinessBoundary';
import type { VisualEditAttributes } from '../../../lib/visual-editing/types';

interface CartBlockRendererProps {
  visualEditAttributes?: VisualEditAttributes;
}

export default function CartBlockRenderer({ visualEditAttributes }: CartBlockRendererProps) {
  return (
    <div {...visualEditAttributes}>
      <PaymentReadinessBoundary>
        <Cart />
      </PaymentReadinessBoundary>
    </div>
  );
}
