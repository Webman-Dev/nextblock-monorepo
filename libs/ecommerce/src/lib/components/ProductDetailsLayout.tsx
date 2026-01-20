'use client';

import React from 'react';
import { useProduct } from '../product-context';
import { ProductGallery } from './ProductGallery';
import { AddToCartButton } from './AddToCartButton';
import { Badge, Separator } from '@nextblock-cms/ui';
import { SimpleTiptapRenderer } from './SimpleTiptapRenderer';

export const ProductDetailsLayout: React.FC = () => {
  const product = useProduct();

  // Price formatting
  const price = product.price / 100;
  const salePrice = product.sale_price ? product.sale_price / 100 : null;
  
  // Image handling - Prioritize array, fallback to single url
  const images = product.images && product.images.length > 0
    ? product.images
    : product.image_url 
      ? [{ url: product.image_url, alt: product.title }]
      : [];
    
  // Discount calculation
  const discountPercentage = salePrice 
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="grid gap-12 lg:grid-cols-2 items-start">
        {/* Left Column: Gallery */}
        <div className="w-full max-w-2xl mx-auto lg:max-w-none">
            <ProductGallery images={images} className="w-full" />
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col gap-8 pt-2 max-w-xl mx-auto lg:mx-0 lg:max-w-none lg:sticky lg:top-24">
          
          <div className="space-y-6">
             {/* Header Section */}
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                    {salePrice && (
                        <Badge variant="destructive" className="px-2.5 py-1 text-xs font-bold uppercase tracking-wide animate-pulse shadow-sm">
                            Sale {discountPercentage}% Off
                        </Badge>
                    )}
                    {product.stock && product.stock < 10 && (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            Only {product.stock} left
                        </Badge>
                     )}
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                    {product.title}
                </h1>

                <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                    {product.short_description ? (
                        <p className="text-lg mb-4">{product.short_description}</p>
                    ) : null}
                </div>
                
                <div className="flex items-baseline gap-4">
                   <div className="flex items-baseline gap-3">
                       <span className="text-4xl font-bold text-primary">
                           ${(salePrice ?? price).toFixed(2)}
                       </span>
                       {salePrice && (
                           <span className="text-2xl text-muted-foreground line-through decoration-destructive/30 decoration-2">
                               ${price.toFixed(2)}
                           </span>
                       )}
                   </div>
                </div>
             </div>

             <Separator className="my-2" />

             {/* Detailed Description */}
             <div className="prose prose-neutral dark:prose-invert max-w-none leading-relaxed">
                 {product.description_json && (
                    <SimpleTiptapRenderer content={product.description_json} />
                 )}
                 {!product.description_json && (
                    <p className="italic text-sm">No description available.</p>
                 )}
             </div>
          </div>

          {/* Action Section */}
          <div className="p-8 rounded-2xl bg-secondary/10 border border-secondary/20 shadow-sm backdrop-blur-sm mt-auto">
             <div className="flex flex-col gap-4">
                 <AddToCartButton 
                    product={{
                        id: product.id,
                        price: salePrice ?? price,
                        title: product.title,
                        image_url: product.image_url,
                        slug: product.slug
                    }} 
                    className="w-full h-14 text-lg font-bold shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                 />
                 <div className="grid grid-cols-2 gap-4 text-center text-xs text-muted-foreground pt-2">
                    <div className="flex items-center justify-center gap-2">
                        <span>📦 Free Shipping</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span>🛡️ Secure Checkout</span>
                    </div>
                 </div>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
