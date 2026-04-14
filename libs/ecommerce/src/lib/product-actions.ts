import { SupabaseClient } from '@supabase/supabase-js';
import { deleteMediaFiles } from '@nextblock-cms/utils/server';
import { Database } from '@nextblock-cms/db';
import { ProductFormValues } from './product-schema';

// Helper to convert dollars to cents
const toCents = (dollars: number) => Math.round(dollars * 100);

function serializeVariantsForRpc(variants?: ProductFormValues['variants']) {
  return (variants || []).map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    upc: variant.upc ?? null,
    price: toCents(variant.price),
    sale_price:
      typeof variant.sale_price === 'number' && !isNaN(variant.sale_price)
        ? toCents(variant.sale_price)
        : null,
    stock_quantity: variant.stock_quantity,
    main_media_id: variant.main_media_id ?? null,
    attribute_term_ids: variant.attribute_term_ids,
  }));
}

function buildProductRpcPayload(data: ProductFormValues, id?: string) {
  return {
    id,
    title: data.title,
    slug: data.slug,
    sku: data.sku,
    upc: data.upc ?? null,
    stock: data.stock,
    status: data.status,
    short_description: data.short_description ?? null,
    description_json: data.description_json ?? null,
    metadata: {},
    price: toCents(data.price),
    sale_price:
      typeof data.sale_price === 'number' && !isNaN(data.sale_price)
        ? toCents(data.sale_price)
        : null,
    freemius_plan_id: data.freemius_plan_id ?? null,
    freemius_product_id: data.freemius_product_id ?? null,
    language_id: data.language_id,
    translation_group_id: data.translation_group_id || undefined,
    variants: serializeVariantsForRpc(data.variants),
  };
}

export async function getProducts(
  supabase: SupabaseClient<Database>,
  { page = 1, limit = 10, search = '', languageId }: { page?: number; limit?: number; search?: string; languageId?: number } = {}
) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from('products')
    .select(
      'id, title, sku, upc, price, sale_price, short_description, stock, status, slug, language_id, translation_group_id, product_media(media(file_path)), product_variants(id, price, sale_price)',
      { count: 'exact' }
    )
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
      languages (
        code
      ),
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
      ),
      product_variants (
        id,
        sku,
        upc,
        main_media_id,
        price,
        sale_price,
        stock_quantity,
        media:main_media_id (
          id,
          file_path,
          object_key,
          description
        ),
        variant_attribute_mapping (
          attribute_term_id,
          product_attribute_terms (
            id,
            attribute_id,
            value,
            slug,
            sort_order,
            value_translations,
            product_attributes (
              id,
              name,
              slug,
              name_translations
            )
          )
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
      languages (
        code
      ),
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
      ),
      product_variants (
        id,
        sku,
        upc,
        main_media_id,
        price,
        sale_price,
        stock_quantity,
        media:main_media_id (
          id,
          file_path,
          object_key,
          description
        ),
        variant_attribute_mapping (
          attribute_term_id,
          product_attribute_terms (
            id,
            attribute_id,
            value,
            slug,
            sort_order,
            value_translations,
            product_attributes (
              id,
              name,
              slug,
              name_translations
            )
          )
        )
      )
    `
    )
    .eq('slug', slug)
    .single();
}

export async function createProduct(supabase: SupabaseClient<Database>, data: ProductFormValues) {
  const { data: productId, error } = await supabase.rpc('upsert_product_with_variants', {
    product_payload: buildProductRpcPayload(data),
  });

  if (error || !productId) throw error || new Error('Failed to create product');

  if (data.product_media && data.product_media.length > 0) {
      const mediaInserts = data.product_media.map((item, index) => ({
        product_id: productId,
        media_id: item.media_id,
        sort_order: index,
      }));
      await supabase.from('product_media').insert(mediaInserts);
  } else if (data.media_id) {
    await supabase.from('product_media').insert({
      product_id: productId,
      media_id: data.media_id,
      sort_order: 0,
    });
  }

  const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
  return product;
}

export async function updateProduct(supabase: SupabaseClient<Database>, id: string, data: ProductFormValues) {
  const { data: currentProductMedia } = await supabase
    .from('product_media')
    .select('media_id')
    .eq('product_id', id);

  const currentMediaIds = currentProductMedia?.map(pm => pm.media_id) || [];

  const { data: productId, error } = await supabase.rpc('upsert_product_with_variants', {
    product_payload: buildProductRpcPayload(data, id),
  });

  if (error || !productId) throw error || new Error('Failed to update product');

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
  } else if (data.media_id) {
     await supabase.from('product_media').delete().eq('product_id', id);
     await supabase.from('product_media').insert({
      product_id: id,
      media_id: data.media_id,
      sort_order: 0,
    });
  }

  const newMediaIds = data.product_media 
    ? data.product_media.map(m => m.media_id)
    : (data.media_id ? [data.media_id] : []);
    
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

      const { count: variantUsageCount } = await supabase
        .from('product_variants')
        .select('*', { count: 'exact', head: true })
        .eq('main_media_id', removedId);

      if (variantUsageCount && variantUsageCount > 0) continue;

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

  const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
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
