import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nextblock-cms/db';
import { ProductFormValues } from './product-schema';

// Helper to convert dollars to cents
const toCents = (dollars: number) => Math.round(dollars * 100);

export async function getProducts(
  supabase: SupabaseClient<Database>,
  { page = 1, limit = 10, search = '' }: { page?: number; limit?: number; search?: string } = {}
) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from('products')
    .select('id, title, sku, price, sale_price, short_description, stock, status, slug, product_media(media(file_path))', { count: 'exact' })
    .range(start, end)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  return query;
}

export async function getProduct(supabase: SupabaseClient<Database>, id: string) {
  return supabase
    .from('products')
    .select(
      `
      *,
      product_media (
        media_id,
        sort_order,
        media (
          id,
          file_path,
          file_name,
          blur_data_url,
          width,
          height
        )
      )
    `
    )
    .eq('id', id)
    .single();
}

export async function getProductBySlug(supabase: SupabaseClient<Database>, slug: string) {
  return supabase
    .from('products')
    .select(
      `
      *,
      product_media (
        media_id,
        sort_order,
        media (
          id,
          file_path,
          file_name,
          blur_data_url,
          width,
          height
        )
      )
    `
    )
    .eq('slug', slug)
    .single();
}

export async function createProduct(supabase: SupabaseClient<Database>, data: ProductFormValues) {
  const { media_id, ...rest } = data;
  
  // Explicit mapping to avoid type errors with spread and optional fields vs null
  const productData = {
    title: rest.title,
    slug: rest.slug,
    sku: rest.sku,
    stock: rest.stock,
    status: rest.status,
    short_description: rest.short_description ?? null, // Convert undefined to null for DB
    description_json: rest.description_json ?? null,
    metadata: {}, // or null
    price: toCents(rest.price),
    // Handle 0 correctly: explicitly check for number type or null check (0 is falsy)
    sale_price: (typeof rest.sale_price === 'number') ? toCents(rest.sale_price) : null,
  };

  const { data: product, error } = await supabase.from('products').insert(productData).select().single();

  if (error) throw error;

  if (data.product_media && data.product_media.length > 0 && product) {
     const mediaInserts = data.product_media.map((item, index) => ({
        product_id: product.id,
        media_id: item.media_id,
        sort_order: index,
      }));
      await supabase.from('product_media').insert(mediaInserts);
  } else if (media_id && product) {
    await supabase.from('product_media').insert({
      product_id: product.id,
      media_id: media_id,
      sort_order: 0,
    });
  }

  return product;
}

export async function updateProduct(supabase: SupabaseClient<Database>, id: string, data: ProductFormValues) {
  const { media_id, ...rest } = data;

  const productData = {
    title: rest.title,
    slug: rest.slug,
    sku: rest.sku,
    stock: rest.stock,
    status: rest.status,
    short_description: rest.short_description ?? null,
    description_json: rest.description_json ?? null,
    price: toCents(rest.price),
    sale_price: (typeof rest.sale_price === 'number') ? toCents(rest.sale_price) : null,
    updated_at: new Date().toISOString(),
  };

  // Type assertion or update ProductFormValues interface if needed to include product_media 


  const { data: product, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Handle media update (simplified: remove all and add new one if provided)
  // In a real app, you might want more complex media management (multiple images, gallery)
  // For now, based on "Image (thumbnail)" requirement, we treat the main image as a single relation or primary one.
  // The schema had product_media as m:n. 
  
  // Handle media update
  if (data.product_media) {
    // 1. Delete existing associations
    // In a more optimized world we'd diff, but for < 20 images this is fine and robust
    await supabase.from('product_media').delete().eq('product_id', id);

    // 2. Insert new associations
    if (data.product_media.length > 0) {
      const mediaInserts = data.product_media.map((item, index) => ({
        product_id: id,
        media_id: item.media_id,
        sort_order: index, // Use current array index as sort order
      }));

      await supabase.from('product_media').insert(mediaInserts);
    }
  } else if (media_id) {
     // Backward compatibility for single media_id field if product_media not provided
     await supabase.from('product_media').delete().eq('product_id', id);
     await supabase.from('product_media').insert({
      product_id: id,
      media_id: media_id,
      sort_order: 0,
    });
  }

  return product;
}

export async function deleteProduct(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}
