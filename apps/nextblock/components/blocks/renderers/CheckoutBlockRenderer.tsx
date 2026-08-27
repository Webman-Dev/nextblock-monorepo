import React from 'react';
import { Checkout } from '@nextblock-cms/ecommerce/components/Checkout';
import PaymentReadinessBoundary from '../../commerce/PaymentReadinessBoundary';
import type { VisualEditAttributes } from '../../../lib/visual-editing/types';

interface CheckoutBlockRendererProps {
  visualEditAttributes?: VisualEditAttributes;
}

export default function CheckoutBlockRenderer({
  visualEditAttributes,
}: CheckoutBlockRendererProps) {
  return (
    <div {...visualEditAttributes}>
      <PaymentReadinessBoundary>
        <Checkout />
      </PaymentReadinessBoundary>
    </div>
  );
}
