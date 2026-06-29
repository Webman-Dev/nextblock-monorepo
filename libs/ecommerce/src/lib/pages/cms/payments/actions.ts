'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';

import type { EnabledPaymentProviders } from '../../../types';
import { savePaymentCredentials } from '../../../payment-config';

async function assertAdmin() {
  const supabase = await createClient();
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
}

export async function savePaymentProviderCredentials(formData: FormData) {
  await assertAdmin();

  await savePaymentCredentials({
    stripe: {
      publishableKey: String(formData.get('stripe_publishableKey') ?? ''),
      secretKey: String(formData.get('stripe_secretKey') ?? ''),
      webhookSecret: String(formData.get('stripe_webhookSecret') ?? ''),
    },
    freemius: {
      developerId: String(formData.get('freemius_developerId') ?? ''),
      publicKey: String(formData.get('freemius_publicKey') ?? ''),
      productId: String(formData.get('freemius_productId') ?? ''),
      secretKey: String(formData.get('freemius_secretKey') ?? ''),
      apiKey: String(formData.get('freemius_apiKey') ?? ''),
    },
  });

  revalidatePath('/cms/payments');
}

export async function updatePaymentSettings(
  enabledProviders: EnabledPaymentProviders
) {
  const supabase = await createClient();

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

  const { error } = await supabase.from('site_settings').upsert({
    key: 'enabled_payment_providers',
    value: enabledProviders,
  });

  if (error) {
    console.error('Error updating payment providers:', error);
    throw new Error('Failed to update settings');
  }

  revalidatePath('/cms/payments');
  revalidatePath('/cms/taxes');
  revalidatePath('/', 'layout');

  return { success: true };
}
