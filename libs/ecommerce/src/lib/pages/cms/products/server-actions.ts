'use server';

import { createClient, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { ProductFormValues } from '../../../product-schema';
import { 
  createProduct as createProductLib, 
  updateProduct as updateProductLib, 
  deleteProduct as deleteProductLib 
} from '../../../product-actions';
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
  await createProductLib(supabase, data);
  revalidatePath('/cms/products');
  redirect('/cms/products');
}

export async function updateProductAction(id: string, data: ProductFormValues) {
  const supabase = createClient();
  await updateProductLib(supabase, id, data);
  revalidatePath('/cms/products');
  revalidatePath(`/cms/products/${id}/edit`);
  redirect('/cms/products');
}

export async function deleteProductAction(id: string) {
  const supabase = createClient();
  await deleteProductLib(supabase, id);
  revalidatePath('/cms/products');
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
