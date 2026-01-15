'use server';

import { createClient } from '@nextblock-cms/db/server';
import { ProductFormValues } from '@nextblock-cms/ecommerce';
import {
  getProduct as getProductLib,
  getProducts as getProductsLib,
  createProduct as createProductLib,
  updateProduct as updateProductLib,
  deleteProduct as deleteProductLib,
} from '@nextblock-cms/ecommerce/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
