'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';

/** Persist the onboarding dismiss flag in the `onboarding_state` row (read-merge). */
export async function setOnboardingDismissed(dismissed: boolean) {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'onboarding_state')
    .maybeSingle();

  const current =
    existing?.value && typeof existing.value === 'object' && !Array.isArray(existing.value)
      ? (existing.value as Record<string, unknown>)
      : {};

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'onboarding_state', value: { ...current, dismissed } });

  if (error) {
    console.error('Error updating onboarding state:', error.message);
    throw new Error('Failed to update onboarding state.');
  }

  revalidatePath('/cms/dashboard');
}
