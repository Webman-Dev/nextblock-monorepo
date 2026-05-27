'use client';

import { useEffect } from 'react';
import { useCartStore, type CartItem } from '@nextblock-cms/ecommerce';

interface UcpCartHydratorProps {
  items: CartItem[];
}

export function UcpCartHydrator({ items }: UcpCartHydratorProps) {
  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    useCartStore.getState().setItems(items);
  }, [items]);

  return null;
}
