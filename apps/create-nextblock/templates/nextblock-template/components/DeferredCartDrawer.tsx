'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useCartStore } from '@nextblock-cms/ecommerce/cart-store';

const CartDrawer = dynamic(
  () => import('./CartDrawerLoader').then((module) => module.CartDrawerLoader),
  { ssr: false }
);

export function DeferredCartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const [shouldLoadDrawer, setShouldLoadDrawer] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldLoadDrawer(true);
    }
  }, [isOpen]);

  return shouldLoadDrawer ? <CartDrawer /> : null;
}
