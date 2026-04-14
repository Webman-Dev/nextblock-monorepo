import { ProductGrid } from '@nextblock-cms/ecommerce';
import { getProducts } from '@nextblock-cms/ecommerce/server';
import { getVariantEffectivePriceRange } from '@nextblock-cms/ecommerce';


import { ProductGridBlockContent } from './ecommerce-block-schemas';

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
    limit: content.limit + 2, 
  }); 
  
  if (!products) {
      return null; // Silent fail if no products
  }

  // 1. Filter out current product and its translations
  const filteredProducts = products.filter(p => {
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
      let imageUrl = undefined;
      // Accessing the nested media object correctly (array of objects with media property)
      // The type from getProducts select is: product_media: { media: { file_path: string | null } | null }[]
      const mediaItem = p.product_media?.[0]?.media;
      if (mediaItem?.file_path) {
         imageUrl = `${process.env.NEXT_PUBLIC_R2_BASE_URL}/${mediaItem.file_path}`;
      }

      const variantPriceRange = getVariantEffectivePriceRange(
        (p.product_variants || []).map((variant: any) => ({
          price: variant.price,
          sale_price: variant.sale_price,
        }))
      );

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        sku: p.sku,
        upc: p.upc || undefined,
        price: p.price,
        sale_price: typeof p.sale_price === 'number' ? p.sale_price : undefined,
        price_range_min: variantPriceRange?.min ?? null,
        price_range_max: variantPriceRange?.max ?? null,
        image_url: imageUrl,
        short_description: p.short_description || undefined,
        language_id: p.language_id as number,
        translation_group_id: p.translation_group_id || "",
        has_variants: (p.product_variants?.length || 0) > 0,
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
