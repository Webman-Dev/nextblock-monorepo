'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { normalizeCountryCode } from '../../../countries';
import { getEcommerceInventorySettings, upsertEcommerceInventorySettings } from '../../../inventory-settings';
import { normalizeSubdivisionCode } from '../../../states';
import type { TaxCalculationMode } from '../../../types';

async function assertAdmin() {
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

  if (!profile || profile.role !== 'ADMIN') {
    throw new Error('Forbidden');
  }

  return supabase;
}

export async function updateTaxSettingsAction(formData: FormData) {
  const supabase = await assertAdmin();
  const currentSettings = await getEcommerceInventorySettings(supabase);
  const enableTaxes = formData.getAll('enableTaxes').includes('true');
  const taxCalculationMode =
    formData.get('taxCalculationMode') === 'automatic'
      ? 'automatic'
      : 'manual';

  const { error } = await upsertEcommerceInventorySettings(supabase, {
    trackQuantities: currentSettings.trackQuantities,
    enableTaxes,
    taxCalculationMode: taxCalculationMode as TaxCalculationMode,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cms/shipping');
  revalidatePath('/cms/settings/taxes');
  redirect('/cms/settings/taxes?success=Tax settings updated');
}

export async function saveTaxRateAction(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get('id') || '').trim();
  const countryCode = normalizeCountryCode(String(formData.get('country_code') || '').trim());
  const rawStateCode = String(formData.get('state_code') || '').trim();
  const taxName = String(formData.get('tax_name') || '').trim();
  const taxRate = Number(formData.get('tax_rate'));

  if (!countryCode) {
    throw new Error('Country code is required.');
  }

  if (!taxName) {
    throw new Error('Tax name is required.');
  }

  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    throw new Error('Tax rate must be between 0 and 100.');
  }

  const payload = {
    country_code: countryCode,
    state_code: normalizeSubdivisionCode(countryCode, rawStateCode) || null,
    tax_name: taxName,
    tax_rate: taxRate,
  };

  const query = id
    ? supabase.from('tax_rates').update(payload).eq('id', id)
    : supabase.from('tax_rates').insert(payload);

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cms/settings/taxes');
}

export async function deleteTaxRateAction(id: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from('tax_rates').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cms/settings/taxes');
}
