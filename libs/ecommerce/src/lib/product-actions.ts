import { SupabaseClient } from '@supabase/supabase-js';
import { deleteMediaFiles } from '@nextblock-cms/utils/server';
import { Database } from '@nextblock-cms/db';
import { ProductFormValues } from './product-schema';

// Helper to convert dollars to cents
const toCents = (dollars: number) => Math.round(dollars * 100);

export async function getProducts(
  supabase: SupabaseClient<Database>,
  { page = 1, limit = 10, search = '', languageId }: { page?: number; limit?: number; search?: string; languageId?: number } = {}
) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from('products')
    .select('id, title, sku, price, sale_price, short_description, stock, status, slug, language_id, translation_group_id, product_media(media(file_path))', { count: 'exact' })
    .range(start, end)
    .order('created_at', { ascending: false });

  if (languageId) {
    query = query.eq('language_id', languageId);
  }

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
  
  const productData = {
    title: rest.title,
    slug: rest.slug,
    sku: rest.sku,
    stock: rest.stock,
    status: rest.status,
    short_description: rest.short_description ?? null,
    description_json: rest.description_json ?? null,
    metadata: {},
    price: toCents(rest.price),
    sale_price: (typeof rest.sale_price === 'number' && !isNaN(rest.sale_price)) 
        ? toCents(rest.sale_price) 
        : null,
    freemius_plan_id: rest.freemius_plan_id ?? null,
    freemius_product_id: rest.freemius_product_id ?? null,
    language_id: rest.language_id,
    translation_group_id: rest.translation_group_id || undefined,
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
    sale_price: (typeof rest.sale_price === 'number' && !isNaN(rest.sale_price)) 
        ? toCents(rest.sale_price) 
        : null,
    freemius_plan_id: rest.freemius_plan_id ?? null,
    freemius_product_id: rest.freemius_product_id ?? null,
    language_id: rest.language_id,
    translation_group_id: rest.translation_group_id,
    updated_at: new Date().toISOString(),
  };

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

  if (data.product_media) {
    await supabase.from('product_media').delete().eq('product_id', id);
    if (data.product_media.length > 0) {
      const mediaInserts = data.product_media.map((item, index) => ({
        product_id: id,
        media_id: item.media_id,
        sort_order: index,
      }));
      await supabase.from('product_media').insert(mediaInserts);
    }
  } else if (media_id) {
     await supabase.from('product_media').delete().eq('product_id', id);
     await supabase.from('product_media').insert({
      product_id: id,
      media_id: media_id,
      sort_order: 0,
    });
  }

  const newMediaIds = data.product_media 
    ? data.product_media.map(m => m.media_id)
    : (media_id ? [media_id] : []);
    
  const explicitlyRemovedIds = data.explicitly_removed_media_ids || [];
  const calculatedRemovedIds = currentMediaIds.filter(id => !newMediaIds.includes(id));
  const removedMediaIds = Array.from(new Set([...calculatedRemovedIds, ...explicitlyRemovedIds]));
  
  if (removedMediaIds.length > 0) {
    for (const removedId of removedMediaIds) {
      const { count: productUsageCount } = await supabase
        .from('product_media')
        .select('*', { count: 'exact', head: true })
        .eq('media_id', removedId);
      
      if (productUsageCount && productUsageCount > 0) continue;

      const { count: postsUsageCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('feature_image_id', removedId);

      if (postsUsageCount && postsUsageCount > 0) continue;

      const { count: logosUsageCount } = await supabase
          .from('logos')
          .select('*', { count: 'exact', head: true })
          .eq('media_id', removedId);
      
      if (logosUsageCount && logosUsageCount > 0) continue;

      const { data: mediaToDelete } = await supabase
        .from('media')
        .select('object_key, variants')
        .eq('id', removedId)
        .single();
      
      if (mediaToDelete) {
         const keysToDelete = [mediaToDelete.object_key];
         if (mediaToDelete.variants && Array.isArray(mediaToDelete.variants)) {
             mediaToDelete.variants.forEach((v: any) => {
                 if (v.objectKey) keysToDelete.push(v.objectKey);
             });
         }
         await deleteMediaFiles(keysToDelete);
         await supabase.from('media').delete().eq('id', removedId);
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

export async function copyProductFromLanguage(
  supabase: SupabaseClient<Database>,
  targetProductId: string,
  sourceProductId: string
) {
  const { data: sourceProduct, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', sourceProductId)
    .single();

  if (fetchError || !sourceProduct) {
    throw new Error(fetchError?.message || 'Source product not found');
  }

  const { error: updateError } = await supabase
    .from('products')
    .update({
      title: sourceProduct.title,
      short_description: sourceProduct.short_description,
      description_json: sourceProduct.description_json,
    })
    .eq('id', targetProductId);

  if (updateError) throw updateError;

  await supabase.from('product_media').delete().eq('product_id', targetProductId);

  const { data: sourceMedia } = await supabase
    .from('product_media')
    .select('media_id, sort_order')
    .eq('product_id', sourceProductId);

  if (sourceMedia && sourceMedia.length > 0) {
    const mediaInserts = sourceMedia.map(sm => ({
      product_id: targetProductId,
      media_id: sm.media_id,
      sort_order: sm.sort_order,
    }));
    await supabase.from('product_media').insert(mediaInserts);
  }

  return { success: true };
}

export async function fetchTranslatedProductsForCartInternal(
  supabase: SupabaseClient,
  translationGroupIds: string[],
  languageCode: string,
  skus: string[] = []
) {
  const { data: language } = await supabase
    .from('languages')
    .select('id')
    .eq('code', languageCode)
    .single();

  if (!language) {
    return { data: [], error: 'Language not found' };
  }

  const filters: string[] = [];
  if (translationGroupIds.length > 0) {
    filters.push(`translation_group_id.in.(${translationGroupIds.join(',')})`);
  }
  if (skus.length > 0) {
    filters.push(`sku.in.(${skus.map(sku => `"${sku}"`).join(',')})`);
  }


  let query = supabase
    .from('products')
    .select(`
      id, 
      title, 
      sku, 
      price, 
      sale_price, 
      slug, 
      language_id,
      product_media (
        media (
          file_path
        )
      ),
      translation_group_id
    `)
    .eq('language_id', language.id)
    .eq('status', 'active');

  if (filters.length > 0) {
    query = query.or(filters.join(','));
  }

  const result = await query.order('id');
  
  return result;
}
