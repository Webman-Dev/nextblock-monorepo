'use client';

import { Product } from '../types';
import { AddToCartButton } from './AddToCartButton';
import { cn } from '@nextblock-cms/utils';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export const ProductCard = ({ product, className }: ProductCardProps) => {
  return (
    <div className={cn("group relative flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md", className)}>
      <Link href={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-neutral-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
             No Image
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${product.slug}`} className="mb-2">
           <h3 className="line-clamp-1 text-lg font-medium text-foreground group-hover:underline">
             {product.title}
           </h3>
        </Link>
        
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary">
            ${(product.sale_price ?? product.price).toFixed(2)}
          </span>
          {product.sale_price && (
            <span className="text-sm text-muted-foreground line-through">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="mt-auto">
          <AddToCartButton 
            product={{
                id: product.id,
                price: product.sale_price ?? product.price,
                title: product.title,
                image_url: product.image_url,
                slug: product.slug
            }} 
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
