'use server';

import { createClient, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { ProductFormValues } from '../../../product-schema';
import {
  createProduct as createProductLib,
  deleteProduct as deleteProductLib,
  syncCategoriesForTranslationGroup
} from '../../../product-actions';
import { syncProductSaleCouponToFreemius } from '../../../freemius-coupons';
import { normalizeCurrencyRecord } from '../../../currency';
import { sanitizeProductFormValuesForStoreManagedCurrencies } from './product-price-sync';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createProductAction(data: ProductFormValues) {
  const supabase = createClient();
  const { data: currencies } = await supabase
    .from('currencies')
    .select(
      'code, symbol, exchange_rate, is_default, is_active, auto_sync_product_prices, auto_update_exchange_rate, exchange_rate_source, exchange_rate_updated_at, rounding_mode, rounding_increment, rounding_charm_amount'
    )
    .eq('is_active', true)
    .order('code', { ascending: true });
  const sanitizedData = sanitizeProductFormValuesForStoreManagedCurrencies(
    data,
    (currencies || []).map((currency) => normalizeCurrencyRecord(currency))
  );

  const createdProduct = await createProductLib(supabase, sanitizedData);

  if (sanitizedData.payment_provider === 'freemius' && createdProduct?.id) {
    try {
      await syncProductSaleCouponToFreemius({
        productId: createdProduct.id,
        client: getServiceRoleSupabaseClient(),
      });
    } catch (couponError) {
      console.error('Failed to sync Freemius sale coupon on create:', couponError);
    }
  }

  revalidatePath('/cms/products');
  redirect('/cms/products');
}

export async function updateProductAction(id: string, data: ProductFormValues) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated.');
  }

  const { data: currencies } = await supabase
    .from('currencies')
    .select(
      'code, symbol, exchange_rate, is_default, is_active, auto_sync_product_prices, auto_update_exchange_rate, exchange_rate_source, exchange_rate_updated_at, rounding_mode, rounding_increment, rounding_charm_amount'
    )
    .eq('is_active', true)
    .order('code', { ascending: true });
  const sanitizedData = sanitizeProductFormValuesForStoreManagedCurrencies(
    data,
    (currencies || []).map((currency) => normalizeCurrencyRecord(currency))
  );

  const { error: upsertError } = await supabase
    .from('product_drafts')
    .upsert(
      {
        product_id: id,
        author_id: user.id,
        meta: sanitizedData as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'product_id' }
    );

  if (upsertError) {
    throw new Error(`Failed to save product draft: ${upsertError.message}`);
  }

  // NOTE: do NOT revalidate the edit route here. This is a debounced autosave
  // that only writes a draft; revalidating refetches the page and re-initializes
  // the form (the variations editor re-emits onChange and re-dirties the form),
  // which re-triggers autosave in an infinite loop. The draft is read fresh on
  // the next real navigation/load, so no revalidation is needed for autosave.
  return { success: true };
}

export async function deleteProductAction(id: string) {
  const supabase = createClient();
  await deleteProductLib(supabase, id);
  revalidatePath('/cms/products');
}

function normalizeProductIds(productIds: string[]) {
  return Array.from(
    new Set(
      productIds
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );
}

export async function bulkDeleteProductsAction(productIds: string[]) {
  const ids = normalizeProductIds(productIds);

  if (ids.length === 0) {
    return { success: false, error: 'Select at least one product.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('products').delete().in('id', ids);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products');
  return { success: true, count: ids.length };
}

export async function bulkDraftProductsAction(productIds: string[]) {
  const ids = normalizeProductIds(productIds);

  if (ids.length === 0) {
    return { success: false, error: 'Select at least one product.' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('products')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products');
  return { success: true, count: ids.length };
}

export async function createProductAttributeAction(input: { name: string; slug?: string }) {
  const supabase = getServiceRoleSupabaseClient();
  const name = input.name.trim();
  const slug = slugify(input.slug?.trim() || input.name);

  if (!name || !slug) {
    return { success: false, error: 'Attribute name is required.' };
  }

  const { error } = await supabase.from('product_attributes').insert({
    name,
    slug,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products/attributes');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true };
}

export async function deleteProductAttributeAction(attributeId: string) {
  const supabase = getServiceRoleSupabaseClient();
  const { error } = await supabase.from('product_attributes').delete().eq('id', attributeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products/attributes');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true };
}

export async function createProductAttributeTermAction(input: {
  attributeId: string;
  value: string;
  slug?: string;
}) {
  const supabase = getServiceRoleSupabaseClient();
  const value = input.value.trim();
  const slug = slugify(input.slug?.trim() || input.value);

  if (!value || !slug) {
    return { success: false, error: 'Term value is required.' };
  }

  const { data: existingTerms } = await supabase
    .from('product_attribute_terms')
    .select('sort_order')
    .eq('attribute_id', input.attributeId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder =
    typeof existingTerms?.[0]?.sort_order === 'number' ? existingTerms[0].sort_order + 1 : 0;

  const { error } = await supabase.from('product_attribute_terms').insert({
    attribute_id: input.attributeId,
    value,
    slug,
    sort_order: nextSortOrder,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products/attributes');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true };
}

export async function reorderProductAttributeTermsAction(input: {
  attributeId: string;
  orderedTermIds: string[];
}) {
  const supabase = getServiceRoleSupabaseClient();

  for (const [index, termId] of input.orderedTermIds.entries()) {
    const { error } = await supabase
      .from('product_attribute_terms')
      .update({
        sort_order: index,
        updated_at: new Date().toISOString(),
      })
      .eq('id', termId)
      .eq('attribute_id', input.attributeId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/cms/products/attributes');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true };
}

export async function updateProductAttributeTranslationsAction(input: {
  attributeId: string;
  nameTranslations: Record<string, string>;
  termTranslations: Array<{
    termId: string;
    valueTranslations: Record<string, string>;
  }>;
}) {
  const supabase = getServiceRoleSupabaseClient();

  const { error: attributeError } = await supabase
    .from('product_attributes')
    .update({
      name_translations: input.nameTranslations,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.attributeId);

  if (attributeError) {
    return { success: false, error: attributeError.message };
  }

  for (const termTranslation of input.termTranslations) {
    const { error } = await supabase
      .from('product_attribute_terms')
      .update({
        value_translations: termTranslation.valueTranslations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', termTranslation.termId)
      .eq('attribute_id', input.attributeId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/cms/products/attributes');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true };
}

export async function deleteProductAttributeTermAction(termId: string) {
  const supabase = getServiceRoleSupabaseClient();
  const { error } = await supabase.from('product_attribute_terms').delete().eq('id', termId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products/attributes');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true };
}

export async function createCategoryAction(input: {
  name: string;
  slug?: string;
  description?: string;
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
}) {
  const supabase = getServiceRoleSupabaseClient();
  const name = input.name.trim();
  const slug = slugify(input.slug?.trim() || input.name);

  if (!name || !slug) {
    return { success: false, error: 'Category name is required.' };
  }

  const { data, error } = await supabase
    .from('categories' as any)
    .insert({
      name,
      slug,
      description: input.description?.trim() || null,
      name_translations: input.nameTranslations || {},
      description_translations: input.descriptionTranslations || {},
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products/categories');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true, category: data as any };
}

export async function updateCategoryAction(
  id: string,
  input: {
    name: string;
    slug?: string;
    description?: string;
    nameTranslations?: Record<string, string>;
    descriptionTranslations?: Record<string, string>;
  }
) {
  const supabase = getServiceRoleSupabaseClient();
  const name = input.name.trim();
  const slug = slugify(input.slug?.trim() || input.name);

  if (!name || !slug) {
    return { success: false, error: 'Category name is required.' };
  }

  const { error } = await supabase
    .from('categories' as any)
    .update({
      name,
      slug,
      description: input.description?.trim() || null,
      name_translations: input.nameTranslations || {},
      description_translations: input.descriptionTranslations || {},
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products/categories');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true };
}

export async function deleteCategoryAction(id: string) {
  const supabase = getServiceRoleSupabaseClient();
  const { error } = await supabase.from('categories' as any).delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cms/products/categories');
  revalidatePath('/cms/products/new');
  revalidatePath('/cms/products');
  return { success: true };
}

export async function syncProductCategoriesAction(productId: string, categoryIds: string[]) {
  const supabase = getServiceRoleSupabaseClient();
  
  try {
    await syncCategoriesForTranslationGroup(supabase, productId, categoryIds);
    revalidatePath('/cms/products');
    revalidatePath(`/cms/products/${productId}/edit`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

