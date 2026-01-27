import { FeaturedProduct } from '@nextblock-cms/ecommerce';
import { getProduct } from '@nextblock-cms/ecommerce/server';

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

  const uiProduct = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price / 100,
      sale_price: typeof product.sale_price === 'number' ? product.sale_price / 100 : undefined,
      image_url: imageUrl,
      short_description: product.short_description || undefined,
      stock: product.stock ?? undefined,
  };

  return (
    <section className={`py-12 ${content.showBackground ? 'bg-secondary/30' : ''}`}>
       <div className="container">
          <FeaturedProduct product={uiProduct} imagePosition={content.imagePosition} />
       </div>
    </section>
  );
};
