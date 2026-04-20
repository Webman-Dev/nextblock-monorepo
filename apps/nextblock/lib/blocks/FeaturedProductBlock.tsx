import { FeaturedProduct } from '@nextblock-cms/ecommerce';
import { getProduct } from '@nextblock-cms/ecommerce/server';
import { getVariantEffectivePriceRange } from '@nextblock-cms/ecommerce';
import { normalizePriceMap, normalizeSalePriceMap } from '@nextblock-cms/ecommerce';

import { FeaturedProductBlockContent } from './ecommerce-block-schemas';
import { getSsgSupabaseClient } from '@nextblock-cms/db/server';

// Component (Server Component)
export const FeaturedProductBlock = async ({ content }: { content: FeaturedProductBlockContent }) => {
  const supabase = getSsgSupabaseClient();
  const { data: product } = await getProduct(supabase, content.productId); // Assuming getProduct takes ID or Slug. Usually ID for blocks.

  if (!product) {
      return null; // Or render placeholder in edit mode
  }

  // Image Resolution
  let imageUrl = undefined;
  const mediaItem = product.product_media?.[0]?.media;
  if (mediaItem?.file_path) {
     imageUrl = `${process.env.NEXT_PUBLIC_R2_BASE_URL}/${mediaItem.file_path}`;
  }

  const variantPriceRange = getVariantEffectivePriceRange(
    ((product as any).product_variants || []).map((variant: any) => ({
      price: variant.price,
      sale_price: variant.sale_price,
    }))
  );

  const uiProduct = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    sku: product.sku,
    upc: product.upc || undefined,
    price: product.price,
    prices: normalizePriceMap(product.prices),
    sale_price: typeof product.sale_price === 'number' ? product.sale_price : undefined,
    sale_prices: normalizeSalePriceMap(product.sale_prices),
    is_taxable: product.is_taxable ?? true,
    price_range_min: variantPriceRange?.min ?? null,
    price_range_max: variantPriceRange?.max ?? null,
    image_url: imageUrl,
    short_description: product.short_description || undefined,
    stock: product.stock,
    language_id: product.language_id,
    translation_group_id: product.translation_group_id || "",
    has_variants: (product.product_variants?.length || 0) > 0,
    product_variants: ((product as any).product_variants || []).map((variant: any) => ({
      id: variant.id,
      price: variant.price,
      prices: normalizePriceMap(variant.prices),
      sale_price: variant.sale_price,
      sale_prices: normalizeSalePriceMap(variant.sale_prices),
    })),
  };

  return (
    <section className={`py-12 ${content.showBackground ? 'bg-secondary/30' : ''}`}>
       <div className="container">
          <FeaturedProduct product={uiProduct} imagePosition={content.imagePosition} />
       </div>
    </section>
  );
};
