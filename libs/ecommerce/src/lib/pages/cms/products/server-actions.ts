'use server';

import { createClient } from '@nextblock-cms/db/server';
import { ProductFormValues } from '../../../product-schema';
import { 
  createProduct as createProductLib, 
  updateProduct as updateProductLib, 
  deleteProduct as deleteProductLib 
} from '../../../product-actions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
