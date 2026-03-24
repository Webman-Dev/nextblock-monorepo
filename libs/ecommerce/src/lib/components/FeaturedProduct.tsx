'use client';

import { Product } from '../types';
import { AddToCartButton } from './AddToCartButton';
import { cn } from '@nextblock-cms/utils';
import Link from 'next/link';

import { useTranslations } from '@nextblock-cms/utils';

interface FeaturedProductProps {
  product: Product;
  className?: string;
  imagePosition?: 'left' | 'right';
}

export const FeaturedProduct = ({ product, className, imagePosition = 'left' }: FeaturedProductProps) => {
  const { t } = useTranslations();
  
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <div className={cn("flex flex-col gap-8 md:flex-row", imagePosition === 'right' && "md:flex-row-reverse")}>
        
        {/* Image Section */}
        <div className="relative aspect-square w-full md:w-1/2">
             {product.image_url ? (
                <img
                    src={product.image_url}
                    alt={product.title}
                    className="h-full w-full object-cover"
                />
             ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
                    {t('ecommerce.no_image')}
                </div>
             )}
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col justify-center p-6 md:p-12">
            <Link href={`/product/${product.slug}`}>
                <h2 className="mb-4 text-3xl font-bold tracking-tight hover:underline md:text-4xl">
                    {product.title}
                </h2>
            </Link>
            
            <div className="mb-6 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                    ${(product.sale_price ?? product.price).toFixed(2)}
                </span>
                {product.sale_price && (
                    <span className="text-lg text-muted-foreground line-through">
                        ${product.price.toFixed(2)}
                    </span>
                )}
            </div>

            {product.short_description && (
                <p className="mb-8 text-lg text-muted-foreground">
                    {product.short_description}
                </p>
            )}

            <div className="flex flex-col gap-4 sm:flex-row">
                <AddToCartButton 
                    product={{
                        ...product,
                        price: product.sale_price ?? product.price,
                    }} 
                    className="h-12 w-full px-8 text-lg sm:w-auto"
                />

                <Link 
                    href={`/product/${product.slug}`} 
                    className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    {t('ecommerce.view_details')}
                </Link>

            </div>
        </div>
      </div>
    </div>
  );
};
