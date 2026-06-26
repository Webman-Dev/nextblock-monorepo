'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import {
  getPrivacySettings as readPrivacySettings,
  mergePrivacySettings,
} from '../../../../lib/privacy/settings';
import type { PrivacySettings } from '../../../../lib/privacy/types';

export interface GoogleAnalyticsSettings {
  gtm_id: string;
  ga_measurement_id: string;
  custom_scripts: string;
}

export async function getGoogleAnalyticsSettings(): Promise<GoogleAnalyticsSettings> {
  const settings = await readPrivacySettings();
  return {
    gtm_id: settings.gtm_id,
    ga_measurement_id: settings.ga_measurement_id,
    custom_scripts: settings.custom_scripts,
  };
}

async function assertAdmin(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to update settings.');
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'ADMIN') {
    throw new Error('You do not have permission to perform this action.');
  }
}

export async function updateGoogleAnalyticsSettings(formData: FormData) {
  await assertAdmin();

  // Only the analytics fields are touched; mergePrivacySettings preserves the
  // banner/corporate fields owned by the Privacy & Consent page.
  const patch: Partial<PrivacySettings> = {
    gtm_id: (formData.get('gtm_id')?.toString() ?? '').trim(),
    ga_measurement_id: (formData.get('ga_measurement_id')?.toString() ?? '').trim(),
    custom_scripts: formData.get('custom_scripts')?.toString() ?? '',
  };

  await mergePrivacySettings(patch);
  // The analytics guard (GTM/GA4 + custom scripts) lives in the root layout.
  revalidatePath('/', 'layout');

  return { success: true, message: 'Google Analytics settings saved.' };
}
