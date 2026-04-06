'use client';

import React from 'react';
import { useProduct } from '../product-context';
import { ProductGallery } from './ProductGallery';
import { AddToCartButton } from './AddToCartButton';
import { SubscriptionSelector } from './SubscriptionSelector';
import { Badge, Separator } from '@nextblock-cms/ui';
import { SimpleTiptapRenderer } from './SimpleTiptapRenderer';
import { useTranslations } from '@nextblock-cms/utils';

export const ProductDetailsLayout: React.FC = () => {
  const product = useProduct();
  const { t } = useTranslations();

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

  const isFreemius = (product as any).custom_props?.provider === 'freemius' || (product as any).freemius_product_id;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="grid gap-12 lg:grid-cols-[2fr_3fr] items-start">
        {/* Left Column: Gallery */}
        <div className="w-full max-w-2xl mx-auto lg:max-w-none">
            <ProductGallery images={images} className="w-full" />
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col gap-8 pt-2 max-w-xl mx-auto lg:mx-0 lg:max-w-none lg:top-24">
          
          <div className="space-y-6">
             {/* Header Section */}
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                    {salePrice && (
                        <Badge variant="destructive" className="px-2.5 py-1 text-xs font-bold uppercase tracking-wide animate-pulse shadow-sm">
                            {t('ecommerce.sale_badge', { percent: String(discountPercentage) })}
                        </Badge>
                    )}
                    {!isFreemius && product.stock && product.stock < 10 && (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            {t('ecommerce.low_stock', { count: String(product.stock) })}
                        </Badge>
                     )}
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                    {product.title}
                </h1>

                <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-left">
                    {product.short_description ? (
                        <div 
                            className="text-lg mb-6 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: product.short_description }}
                        />
                    ) : null}
                </div>
                
                {!isFreemius && (
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
                )}
             </div>

             <Separator className="my-2" />
          </div>

          {/* Action Section */}
          <div className="p-8 rounded-2xl bg-secondary/10 border border-secondary/20 shadow-sm backdrop-blur-sm mt-auto">
             <div className="flex flex-col gap-4">
                 {isFreemius ? (
                     <SubscriptionSelector product={product} />
                 ) : (
                     <AddToCartButton 
                        product={{
                            ...product,
                            price: salePrice ?? price,
                        }} 
                        className="w-full h-14 text-lg font-bold shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                     />
                 )}
                 <div className="grid grid-cols-2 gap-4 text-center text-xs text-muted-foreground pt-2">
                    <div className="flex items-center justify-center gap-2">
                        {((product as any).custom_props?.provider === 'freemius' || (product as any).freemius_product_id) ? (
                            <span>📥 {t('ecommerce.instant_digital_delivery')}</span>
                        ) : (
                            <span>📦 {t('ecommerce.free_shipping')}</span>
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span>🛡️ {t('ecommerce.secure_checkout')}</span>
                    </div>
                 </div>
             </div>
          </div>
          
        </div>
      </div>

      {/* Detailed Description */}
        <div className="prose prose-neutral dark:prose-invert max-w-none leading-relaxed mt-12">
            {product.description_json && (
            <SimpleTiptapRenderer content={product.description_json} />
            )}
            {!product.description_json && (
            <p className="italic text-sm">{t('ecommerce.no_description')}</p>
            )}
        </div>
    </div>
  );
};
