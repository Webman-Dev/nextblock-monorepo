import { getProduct, getProducts } from '@nextblock-cms/ecommerce/server';
import { AddToCartButton, ProductGallery } from '@nextblock-cms/ecommerce';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

import { getSsgSupabaseClient } from '@nextblock-cms/db/server';

export async function generateStaticParams() {
  const supabase = getSsgSupabaseClient();
  const { data: products } = await getProducts(supabase);
  if (!products) return [];
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = getSsgSupabaseClient();

  // getProduct in 'product-actions' likely takes a slug or ID. 
  // Let's assume it supports slug since the URL is /product/[slug].
  const { data: product } = await getProduct(supabase, slug);

  if (!product) {
    notFound();
  }

  // Value Mapping
  const price = product.price / 100;
  const sale_price = typeof product.sale_price === 'number' ? product.sale_price / 100 : undefined;
  
  // Image Resolution
  let imageUrl = undefined;
  const mediaItem = product.product_media?.[0]?.media;
  if (mediaItem?.file_path) {
     imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${mediaItem.file_path}`;
  }

  // Gallery Images
  const images = imageUrl 
    ? [{ url: imageUrl, alt: product.title }] 
    : [];

  return (
    <div className="container py-12">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Left Column: Gallery */}
        <div>
          <ProductGallery images={images} />
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{product.title}</h1>
            <div className="mt-4 flex items-baseline gap-4">
              <span className="text-3xl font-bold text-primary">
                ${(sale_price ?? price).toFixed(2)}
              </span>
              {sale_price && (
                <span className="text-lg text-muted-foreground line-through">
                  ${price.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-y py-6">
             <AddToCartButton 
                product={{
                    id: product.id,
                    price: sale_price ?? price,
                    title: product.title,
                    image_url: imageUrl,
                    slug: product.slug
                }} 
                className="h-12 w-full text-lg"
             />
          </div>

          <div className="prose prose-neutral max-w-none">
             {/* Description Rendering */}
             {/* If description_json exists, we'd render it. For now, using short_description or simple text */}
             <h3 className="text-lg font-semibold">Description</h3>
             {product.short_description ? (
                <p>{product.short_description}</p>
             ) : (
                <p className="text-muted-foreground italic">No description available.</p>
             )}
             
             {/* TODO: Implement Rich Text Renderer for description_json */}
          </div>
        </div>
      </div>
    </div>
  );
}
