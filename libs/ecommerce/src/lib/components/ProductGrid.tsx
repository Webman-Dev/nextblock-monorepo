'use client';

import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { cn } from '@nextblock-cms/utils';

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export const ProductGrid = ({ products, columns = 3, className }: ProductGridProps) => {
  if (!products.length) {
    return <div className="py-12 text-center text-muted-foreground">No products found.</div>;
  }

  return (
    <div 
      className={cn(
        "grid gap-6 sm:grid-cols-2", 
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "lg:grid-cols-4",
        className
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
