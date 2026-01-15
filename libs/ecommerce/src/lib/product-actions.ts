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
    .select('id, title, sku, price, stock, status, slug, product_media(media(file_path))', { count: 'exact' })
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

  if (media_id && product) {
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
  
  if (media_id) {
    // Check if this media is already linked? 
    // Or just clear and re-link as primary? 
    // Let's assume we replace the "primary" image (sort_order 0 or just the first one)
    // For simplicity given the requirement "reuse MediaPickerDialog to select *a* product image":
    
    // First, remove existing media for this product if we want to replace it strict 1-1 style for the main image?
    // Or just append?
    // The prompt says "Store the media_id in the form". 
    // Let's assume we overwrite the existing associations to keep it simple for a single image picker, 
    // OR we check if it exists. 
    // Let's do a replace strategy for now to match the "single image" feel of the form input.
    
    await supabase.from('product_media').delete().eq('product_id', id);
    
    await supabase.from('product_media').insert({
      product_id: id,
      media_id: media_id,
      sort_order: 0,
    });
  } else {
      // If media_id is explicitly undefined/null, maybe we should clear it?
      // But the form might just not send it if unchanged? 
      // Safe bet: if media_id is provided, set it.
  }

  return product;
}

export async function deleteProduct(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}
