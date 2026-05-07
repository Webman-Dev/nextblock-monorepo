'use client';

import { Badge } from '@nextblock-cms/ui/badge';
import { Button } from '@nextblock-cms/ui/button';
import { ShoppingBag } from 'lucide-react';
import { useCartStore, useCartTotalItems } from '../cart-store';
import { useCart } from '../use-cart';

export const CartIcon = () => {
  const toggleCart = useCartStore((state) => state.toggleCart);
  
  // Use selector to get count directly
  // We use useCart wrapper if we want to ensure we don't show "0" then flash to "5".
  // A common pattern is to show empty or loading until hydrated.
  const totalItems = useCartTotalItems();
  const hydrated = useCart((state) => state.isOpen) !== undefined; // Check if hydrated via a property

  if (!hydrated) {
    return (
        <Button variant="ghost" size="icon" className="relative" aria-label="Open cart">
            <ShoppingBag className="h-5 w-5" />
        </Button>
    )
  }

  return (
    <Button 
        variant="ghost" 
        size="icon" 
        className="relative" 
        onClick={toggleCart}
        aria-label="Open cart"
    >
      <ShoppingBag className="h-5 w-5" />
      {totalItems > 0 && (
        <Badge 
            variant="destructive" 
            className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center p-0 text-[10px]"
        >
          {totalItems}
        </Badge>
      )}
    </Button>
  );
};
