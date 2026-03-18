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
