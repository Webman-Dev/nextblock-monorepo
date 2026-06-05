'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import {
  getPrivacySettings as readPrivacySettings,
  savePrivacySettings,
} from '../../../../lib/privacy/settings';
import type { PrivacySettings } from '../../../../lib/privacy/types';

export async function getPrivacySettings(): Promise<PrivacySettings> {
  return readPrivacySettings();
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

export async function updatePrivacySettings(formData: FormData) {
  await assertAdmin();

  const settings: PrivacySettings = {
    banner_enabled: formData.get('banner_enabled') === 'true',
    gtm_id: (formData.get('gtm_id')?.toString() ?? '').trim(),
    ga_measurement_id: (formData.get('ga_measurement_id')?.toString() ?? '').trim(),
    custom_scripts: formData.get('custom_scripts')?.toString() ?? '',
    corporate: {
      legal_name: (formData.get('legal_name')?.toString() ?? '').trim(),
      address: (formData.get('address')?.toString() ?? '').trim(),
      support_email: (formData.get('support_email')?.toString() ?? '').trim(),
    },
  };

  await savePrivacySettings(settings);
  // Footer (corporate identity) and the analytics guard live in the root layout.
  revalidatePath('/', 'layout');

  return { success: true, message: 'Privacy settings saved.' };
}
