'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import {
  getPrivacySettings as readPrivacySettings,
  mergePrivacySettings,
} from '../../../../lib/privacy/settings';
import type { PrivacySettings } from '../../../../lib/privacy/types';
import type { SettingsActionResult } from '../../../../lib/cms/action-result';

export async function getPrivacySettings(): Promise<PrivacySettings> {
  return readPrivacySettings();
}

/** Null when the caller is an ADMIN, otherwise the failure to return. */
async function adminCheck(): Promise<SettingsActionResult | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be logged in to update settings.' };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'ADMIN') {
    return { ok: false, error: 'You do not have permission to perform this action.' };
  }
  return null;
}

export async function updatePrivacySettings(formData: FormData): Promise<SettingsActionResult> {
  const denied = await adminCheck();
  if (denied) return denied;

  // Analytics fields (GTM/GA4/custom scripts) are owned by the Google Analytics
  // settings page; merge only the consent + corporate fields so they aren't clobbered.
  const patch: Partial<PrivacySettings> = {
    banner_enabled: formData.get('banner_enabled') === 'true',
    corporate: {
      legal_name: (formData.get('legal_name')?.toString() ?? '').trim(),
      address: (formData.get('address')?.toString() ?? '').trim(),
      support_email: (formData.get('support_email')?.toString() ?? '').trim(),
    },
  };

  try {
    await mergePrivacySettings(patch);
  } catch (error) {
    console.error('Failed to save privacy settings:', error);
    return { ok: false, error: 'Failed to save privacy settings.' };
  }
  // Footer (corporate identity) and the analytics guard live in the root layout.
  revalidatePath('/', 'layout');

  return { ok: true, message: 'Privacy settings saved.' };
}
