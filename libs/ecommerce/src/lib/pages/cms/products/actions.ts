'use server';

import { createClient } from '@nextblock-cms/db/server';
import { 
  getProduct as getProductLib, 
  getProducts as getProductsLib
} from '../../../product-actions';

export async function getProducts(options?: { page?: number; limit?: number; search?: string }) {
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
