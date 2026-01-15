'use client';

import { Button } from '@nextblock-cms/ui';
import { ShoppingCart } from 'lucide-react';

import { useCart } from '../use-cart';

interface Product {
  id: string;
  title: string;
  price: number;
  image_url?: string;
  slug: string;
}

interface AddToCartButtonProps {
  product: Product;
  className?: string;
}

export const AddToCartButton = ({ product, className }: AddToCartButtonProps) => {
  // Use useCart to get safe hydration version of addItem, 
  // or use store directly since this action is client-side interaction anyway.
  // Using direct store access is safe for actions, but we might want to ensure 'items' 
  // are synced. However, addItem is a function, not state, so it's stable.
  // But to be consistent with hydration pattern:
  const store = useCart((state) => state);

  if (!store) {
    // Render a disabled or loading state button during hydration if preferred,
    // or just render the button which will become interactive after hydration.
    // For better UX, we can render the button but it won't work until hydrated.
    return (
      <Button disabled className={className}>
        <ShoppingCart className="mr-2 h-4 w-4" />
        Add to Cart
      </Button>
    );
  }

  const { addItem } = store;

  const handleAddToCart = () => {
    addItem({
      id: product.id, // Assuming simple ID mapping for now. For variants, ID should be variant ID.
      product_id: product.id,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
      slug: product.slug,
    });
  };

  return (
    <Button onClick={handleAddToCart} className={className}>
      <ShoppingCart className="mr-2 h-4 w-4" />
      Add to Cart
    </Button>
  );
};
