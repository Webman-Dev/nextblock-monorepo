import { SupabaseClient } from '@supabase/supabase-js';
import { deleteMediaFiles } from '@nextblock-cms/utils/server';
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

  // Get current media associations before update to identify removed ones
  const { data: currentProductMedia } = await supabase
    .from('product_media')
    .select('media_id')
    .eq('product_id', id);

  const currentMediaIds = currentProductMedia?.map(pm => pm.media_id) || [];

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

  // IDENTIFY AND CLEAN UP ORPHANED MEDIA
  // Calculate which media IDs were removed from this product
  const newMediaIds = data.product_media 
    ? data.product_media.map(m => m.media_id)
    : (media_id ? [media_id] : []);
    
  console.log(`[updateProduct] Cleanup Check - Product: ${id}`);

  const explicitlyRemovedIds = data.explicitly_removed_media_ids || [];

  const calculatedRemovedIds = currentMediaIds.filter(id => !newMediaIds.includes(id));
  
  // Combine both lists and deduplicate
  const removedMediaIds = Array.from(new Set([...calculatedRemovedIds, ...explicitlyRemovedIds]));
  
  if (removedMediaIds.length > 0) {
    for (const removedId of removedMediaIds) {
      // Check if this media is used by ANY other product (product_media table)
      // Note: We already deleted the relation for THIS product above, so count should be 0 if it was unique to this product
      const { count: productUsageCount, error: productUsageError } = await supabase
        .from('product_media')
        .select('*', { count: 'exact', head: true })
        .eq('media_id', removedId);
      
      if (productUsageError) {
        console.error('Error checking product usage for media cleanup:', productUsageError);
        continue;
      }

      if (productUsageCount && productUsageCount > 0) continue; // Used by another product

      // Check posts usage
      const { count: postsUsageCount, error: postsUsageError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('feature_image_id', removedId);

      if (postsUsageError) {
          console.error('Error checking posts usage for media cleanup:', postsUsageError);
          continue;
      }

      if (postsUsageCount && postsUsageCount > 0) continue; // Used by a post

      // Check logos usage
      const { count: logosUsageCount, error: logosUsageError } = await supabase
          .from('logos')
          .select('*', { count: 'exact', head: true })
          .eq('media_id', removedId);
      
      if (logosUsageError) {
          console.error('Error checking logos usage for media cleanup:', logosUsageError);
          continue;
      }
      
      if (logosUsageCount && logosUsageCount > 0) continue; // Used by a logo

      // If we reach here, the media is an orphan. Delete it!
      
      // 1. Get media details to find file path and variants
      const { data: mediaToDelete } = await supabase
        .from('media')
        .select('object_key, variants')
        .eq('id', removedId)
        .single();
      
      if (mediaToDelete) {
         const keysToDelete = [mediaToDelete.object_key];
         // Add variant keys if they exist
         if (mediaToDelete.variants && Array.isArray(mediaToDelete.variants)) {
             mediaToDelete.variants.forEach((v: any) => {
                 if (v.objectKey) keysToDelete.push(v.objectKey);
             });
         }

         // 2. Delete from R2
         await deleteMediaFiles(keysToDelete);

         // 3. Delete from DB
         await supabase.from('media').delete().eq('id', removedId);
         console.log(`Orphaned media ${removedId} deleted.`);
      }
    }
  }

  return product;
}



export async function deleteProduct(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}
