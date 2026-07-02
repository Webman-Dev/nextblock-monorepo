import { ProductGrid } from '@nextblock-cms/ecommerce/components/ProductGrid';
import { getProducts } from '@nextblock-cms/ecommerce/server';
import { normalizePriceMap, normalizeSalePriceMap } from '@nextblock-cms/ecommerce/currency';
import { getVariantEffectivePriceRange } from '@nextblock-cms/ecommerce/variation-utils';


import type { ProductGridBlockContent } from './ecommerce-block-schemas';

import { getSsgSupabaseClient } from '@nextblock-cms/db/server';

interface ProductGridBlockProps {
  content: ProductGridBlockContent;
  languageId?: number;
  excludeProductId?: string;
  excludeTranslationGroupId?: string | null;
}

// Component (Server Component)
export const ProductGridBlock = async ({ 
  content, 
  languageId,
  excludeProductId,
  excludeTranslationGroupId,
}: ProductGridBlockProps) => {
  const supabase = getSsgSupabaseClient();
  // Fetch products filtered by language
  // We fetch more to ensure we have enough after manual checks
  const { data: products } = await getProducts(supabase, {
    languageId,
    categoryId: content.type === 'category' ? content.categoryId : undefined,
    limit: content.limit + 2, 
  }); 
  
  const productRows = (products || []) as any[];

  if (productRows.length === 0) {
      return null; // Silent fail if no products
  }

  // 1. Filter out current product and its translations
  const filteredProducts = productRows.filter((p) => {
    if (excludeProductId && p.id === excludeProductId) return false;
    if (excludeTranslationGroupId && p.translation_group_id === excludeTranslationGroupId) return false;
    return true;
  });

  // 2. Hide if no products remain
  if (filteredProducts.length === 0) {
      return null;
  }

  // 3. Transform DB products to UI products
  const uiProducts = filteredProducts.slice(0, content.limit).map(p => {
      const productRecord = p as any;
      let imageUrl = undefined;
      // Accessing the nested media object correctly (array of objects with media property)
      // The type from getProducts select is: product_media: { media: { file_path: string | null } | null }[]
      const mediaItem = p.product_media?.[0]?.media;
      if (mediaItem?.file_path) {
         if (mediaItem.file_path.startsWith('http')) {
           imageUrl = mediaItem.file_path;
         } else if (process.env.NEXT_PUBLIC_R2_BASE_URL) {
           imageUrl = `${process.env.NEXT_PUBLIC_R2_BASE_URL}/${mediaItem.file_path}`;
         } else {
           imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/media/${mediaItem.file_path}`;
         }
      }

      const variantPriceRange = getVariantEffectivePriceRange(
        (p.product_variants || []).map((variant: any) => ({
          price: variant.price,
          sale_price: variant.sale_price,
          sale_start_at: variant.sale_start_at ?? null,
          sale_end_at: variant.sale_end_at ?? null,
        }))
      );

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        sku: p.sku,
        average_rating: p.average_rating,
        total_reviews: p.total_reviews,
        upc: p.upc || undefined,
        price: p.price,
        prices: normalizePriceMap(p.prices),
        sale_price: typeof p.sale_price === 'number' ? p.sale_price : undefined,
        sale_prices: normalizeSalePriceMap(p.sale_prices),
        sale_start_at: p.sale_start_at ?? null,
        sale_end_at: p.sale_end_at ?? null,
        scheduled_price: typeof p.scheduled_price === 'number' ? p.scheduled_price : undefined,
        scheduled_prices: normalizePriceMap(p.scheduled_prices),
        scheduled_price_at: p.scheduled_price_at ?? null,
        is_taxable: p.is_taxable ?? true,
        product_type: productRecord.product_type ?? undefined,
        payment_provider: productRecord.payment_provider ?? undefined,
        price_range_min: variantPriceRange?.min ?? null,
        price_range_max: variantPriceRange?.max ?? null,
        image_url: imageUrl,
        short_description: p.short_description || undefined,
        categories: (p.product_categories || []).map((pc: any) => pc.category).filter(Boolean),
        language_id: p.language_id as number,
        translation_group_id: p.translation_group_id || "",
        freemius_product_id: productRecord.freemius_product_id || undefined,
        freemius_plan_id: productRecord.freemius_plan_id || undefined,
        trial_period_days: productRecord.trial_period_days ?? 0,
        trial_requires_payment_method:
          productRecord.trial_requires_payment_method ?? false,
        freemius_plans: productRecord.freemius_plans,
        has_variants: (p.product_variants?.length || 0) > 0,
        product_variants: (p.product_variants || []).map((variant: any) => ({
          id: variant.id,
          price: variant.price,
          prices: normalizePriceMap(variant.prices),
          sale_price: variant.sale_price,
          sale_prices: normalizeSalePriceMap(variant.sale_prices),
          sale_start_at: variant.sale_start_at ?? null,
          sale_end_at: variant.sale_end_at ?? null,
          scheduled_price: variant.scheduled_price ?? null,
          scheduled_prices: normalizePriceMap(variant.scheduled_prices),
          scheduled_price_at: variant.scheduled_price_at ?? null,
        })),
      };
  });

  return (
    <section className="py-12">
       {content.title && (
         <div className="container mb-8">
            <h2 className="text-3xl font-bold tracking-tight">{content.title}</h2>
         </div>
       )}
       <div className="container">
          <ProductGrid products={uiProducts} />
       </div>
    </section>
  );
};
