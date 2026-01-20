import { getProductBySlug, getProducts } from '@nextblock-cms/ecommerce/server';
import { ProductProvider } from '@nextblock-cms/ecommerce';
import { getSsgSupabaseClient } from '@nextblock-cms/db/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getPageDataBySlug } from "../../[slug]/page.utils";
import BlockRenderer from "../../../components/BlockRenderer";
import { CurrentContentSetter } from "../../../components/CurrentContentSetter";
// Ensure BlockType is imported or compatible with BlockRenderer props
import type { Database } from "@nextblock-cms/db";
type BlockType = Database['public']['Tables']['blocks']['Row'];

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const supabase = getSsgSupabaseClient();
  const { data: products } = await getProducts(supabase);
  if (!products) return [];
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSsgSupabaseClient();
  const { data: product } = await getProductBySlug(supabase, slug);

  if (!product) return { title: 'Product Not Found' };
  
  // Resolve image URL for OG Image
  let imageUrl = undefined;
  const mediaItem = product.product_media?.[0]?.media;
  if (mediaItem?.file_path) {
     if (mediaItem.file_path.startsWith('http')) {
        imageUrl = mediaItem.file_path;
     } else if (process.env.NEXT_PUBLIC_R2_BASE_URL) {
        imageUrl = `${process.env.NEXT_PUBLIC_R2_BASE_URL}/${mediaItem.file_path}`;
     } else {
        imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${mediaItem.file_path}`;
     }
  }

  return {
    title: product.title,
    description: product.short_description || `Buy ${product.title}`,
    openGraph: {
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = getSsgSupabaseClient();

  // 1. Fetch Product Data
  const { data: product } = await getProductBySlug(supabase, slug);

  if (!product) {
    notFound();
  }

  // 2. Fetch Template Page
  const templatePage = await getPageDataBySlug('product-template');

  // 3. Fallback or Use Template
  let blocks: BlockType[] = [];
  let languageId = 1; // Default to 1 if not found

  if (templatePage) {
    blocks = templatePage.blocks;
    languageId = templatePage.language_id;
  } else {
    // Fallback Layout if no template exists
    // We cast to any to avoid strict DB type matching for fallback mocks, specifically for UUID/Dates
    blocks = [
      {
        id: 'fallback-product-details',
        block_type: 'product_details',
        content: {},
        page_id: 'temp',
        order: 0,
        language_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
         id: 'fallback-related-title',
         block_type: 'heading',
         content: { level: 2, text_content: "You might also like", textAlign: "center" },
         page_id: 'temp',
         order: 1,
         language_id: 1,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
      },
      {
         id: 'fallback-product-grid',
         block_type: 'product_grid',
         content: { type: 'latest', limit: 4 },
         page_id: 'temp',
         order: 2,
         language_id: 1,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
      }
    ] as any as BlockType[];
  }

  // 4. Transform Product Data for Context
  // Value Mapping
  // Image URL resolution
  let imageUrl: string | undefined = undefined;
  const images: { url: string; alt?: string }[] = [];
  
  if (product.product_media && product.product_media.length > 0) {
      // Sort by sort_order
      const sortedMedia = [...product.product_media].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      
      sortedMedia.forEach(pm => {
          if (pm.media?.file_path) {
              let url = '';
              if (pm.media.file_path.startsWith('http')) {
                  url = pm.media.file_path;
              } else if (process.env.NEXT_PUBLIC_R2_BASE_URL) {
                  url = `${process.env.NEXT_PUBLIC_R2_BASE_URL}/${pm.media.file_path}`;
              } else {
                  url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${pm.media.file_path}`;
              }
              
              images.push({ url, alt: product.title });
              
              // Set primary image if it's the first one
              if (!imageUrl) imageUrl = url;
          }
      });
  }

  const contextProduct = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    price: product.price,
    sale_price: product.sale_price || null,
    image_url: imageUrl,
    images: images,
    short_description: product.short_description || undefined,
    description_json: product.description_json,
    stock: product.stock !== undefined && product.stock !== null ? product.stock : undefined
  };

  return (
    <div className="min-h-screen bg-background pb-12">
        <ProductProvider product={contextProduct}>
            {/* 
              BlockRenderer expects languageId property. 
              If templatePage is null, we defaulted languageId to 1.
            */}
            <CurrentContentSetter id={product.id} type="product" slug={product.slug} />
            <BlockRenderer blocks={blocks} languageId={languageId} />
        </ProductProvider>
    </div>
  );
}
