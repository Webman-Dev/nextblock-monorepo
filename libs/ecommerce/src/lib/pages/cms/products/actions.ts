'use server';

import { createClient, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { 
  getProduct as getProductLib, 
  getProducts as getProductsLib
} from '../../../product-actions';

export async function getProducts(options?: { page?: number; limit?: number; search?: string; languageId?: number }) {
  const supabase = createClient();
  const { data, count, error } = await (await getProductsLib(supabase, options));
  if (error) throw new Error(error.message);
  return { data, count };
}

export async function getProduct(id: string) {
  const supabase = createClient();
  const { data, error } = await getProductLib(supabase, id);
  if (error) throw new Error(error.message);
  return data;
}

import { 
  syncFreemiusProductsToSupabase, 
  syncSingleFreemiusProduct 
} from '../../../providers/freemius';
import { revalidatePath } from 'next/cache';

export async function triggerFreemiusSync() {
  try {
    const result = await syncFreemiusProductsToSupabase();
    revalidatePath('/cms/products', 'page');
    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message || 'Failed to sync with Freemius' };
  }
}

export async function triggerSingleProductSync(productId: string) {
  try {
    const result = await syncSingleFreemiusProduct(productId);
    revalidatePath('/cms/products', 'page');
    return { success: true, data: result };
  } catch (error: any) {
    return { error: error.message || 'Failed to sync product with Freemius' };
  }
}

import { copyProductFromLanguage as copyProductLib } from '../../../product-actions';

export async function copyProductFromLanguageAction(targetId: string, sourceId: string) {
  try {
    const supabase = createClient();
    await copyProductLib(supabase, targetId, sourceId);
    revalidatePath('/cms/products');
    revalidatePath(`/cms/products/${targetId}/edit`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to copy product content' };
  }
}

export async function getProductTranslations(translationGroupId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, title, language_id, slug')
    .eq('translation_group_id', translationGroupId);
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getGlobalProductAttributes() {
  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('product_attributes')
    .select(`
      id,
      name,
      name_translations,
      slug,
      product_attribute_terms (
        id,
        attribute_id,
        value,
        slug,
        sort_order,
        value_translations
      )
    `);

  if (error) {
    throw new Error(error.message);
  }

  return (data || [])
    .map((attribute: any) => ({
      ...attribute,
      product_attribute_terms: (attribute.product_attribute_terms || []).sort((a: any, b: any) =>
        (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
        a.value.localeCompare(b.value)
      ),
    }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
}

export async function getFreemiusPricingByProductId(productId: string) {
  // NOTE: freemius_plans/freemius_pricing tables exist in migration but may not
  // yet be in the auto-generated Database types. Using `as any` until DB is reset.
  const supabase = createClient() as any;
  const { data, error } = await supabase
    .from('freemius_plans')
    .select(`
      id,
      name,
      title,
      freemius_pricing (
        id,
        license_quota,
        api_monthly_price,
        api_annual_price,
        api_lifetime_price,
        override_monthly_price,
        override_annual_price,
        override_lifetime_price,
        is_active
      )
    `)
    .eq('product_id', productId);
    
  if (error) throw new Error(error.message);
  return data;
}

export async function updateFreemiusOverride(pricingId: string, overrides: { 
  override_monthly_price?: number | null; 
  override_annual_price?: number | null; 
  override_lifetime_price?: number | null; 
}) {
  // NOTE: freemius_pricing table exists in migration but may not yet be in
  // the auto-generated Database types. Using `as any` until DB is reset.
  const supabase = createClient() as any;
  const { error } = await supabase
    .from('freemius_pricing')
    .update({
      ...overrides,
      updated_at: new Date().toISOString()
    })
    .eq('id', pricingId);
    
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath('/cms/products');
  return { success: true };
}

export async function getPublicFreemiusPricing(freemiusProductId: string) {
  // Queries freemius_plans/freemius_pricing and falls back gracefully.
  const supabase = createClient() as any;
  const { data, error } = await supabase
    .from('freemius_plans')
    .select(`
      id,
      name,
      title,
      freemius_pricing (
        id,
        license_quota,
        api_monthly_price,
        api_annual_price,
        api_lifetime_price,
        override_monthly_price,
        override_annual_price,
        override_lifetime_price,
        is_active
      )
    `)
    .eq('product_id', freemiusProductId);

  if (error) throw new Error(error.message);

  // Map to resolved pricing
  const resolvedPlans = (data || []).map((plan: any) => {
    return {
      id: plan.id,
      name: plan.name,
      title: plan.title,
      pricing: (plan.freemius_pricing || []).map((pricing: any) => {
        return {
          id: pricing.id,
          license_quota: pricing.license_quota,
          monthly_price: pricing.override_monthly_price ?? pricing.api_monthly_price,
          annual_price: pricing.override_annual_price ?? pricing.api_annual_price,
          lifetime_price: pricing.override_lifetime_price ?? pricing.api_lifetime_price,
          is_active: pricing.is_active,
        };
      })
    };
  });

  return resolvedPlans;
}
