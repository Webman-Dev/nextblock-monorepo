import { ProductGrid } from '@nextblock-cms/ecommerce';
import { getProducts } from '@nextblock-cms/ecommerce/server';


import { ProductGridBlockContent } from './ecommerce-block-schemas';

import { getSsgSupabaseClient } from '@nextblock-cms/db/server';

// Component (Server Component)
export const ProductGridBlock = async ({ content }: { content: ProductGridBlockContent }) => {
  const supabase = getSsgSupabaseClient();
  // In a real app we'd filter by category if type is category
  const { data: products } = await getProducts(supabase); 
  
  if (!products) {
      return <div>Error loading products</div>;
  }

  // Transform DB products to UI products
  const uiProducts = products.slice(0, content.limit).map(p => {
      let imageUrl = undefined;
      // Accessing the nested media object correctly (array of objects with media property)
      // The type from getProducts select is: product_media: { media: { file_path: string | null } | null }[]
      const mediaItem = p.product_media?.[0]?.media;
      if (mediaItem?.file_path) {
         imageUrl = `${process.env.NEXT_PUBLIC_R2_BASE_URL}/${mediaItem.file_path}`;
      }

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        price: p.price / 100,
        sale_price: typeof p.sale_price === 'number' ? p.sale_price / 100 : undefined,
        image_url: imageUrl,
        short_description: p.short_description || undefined
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
