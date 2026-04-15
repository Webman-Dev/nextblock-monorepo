'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { upsertEcommerceInventorySettings } from '../../../../inventory-settings';

export async function updateInventorySettingsAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['ADMIN', 'WRITER'].includes(profile.role)) {
    throw new Error('Forbidden');
  }

  const rawValues = formData.getAll('trackQuantities');
  const trackQuantities = rawValues.includes('true');

  const { error } = await upsertEcommerceInventorySettings(supabase, {
    trackQuantities,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cms/products');
  revalidatePath('/cms/products/settings');
  redirect('/cms/products/settings?success=Inventory settings updated');
}
