// app/cms/settings/copyright/actions.ts
'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';

export type CopyrightSettings = {
  [key: string]: string;
};

// site_settings key holding the "Published with NextBlock™ CMS" footer attribution
// toggle. Absent row = enabled (the default), so fresh installs show the backlink.
const FOOTER_ATTRIBUTION_KEY = 'footer_show_attribution';

/**
 * Whether the "Published with NextBlock™ CMS" backlink shows in the public footer.
 * Defaults to ON when the setting has never been saved.
 */
export async function getFooterAttributionEnabled(): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', FOOTER_ATTRIBUTION_KEY)
    .maybeSingle();

  if (error || !data) {
    return true;
  }

  // Stored as a JSON boolean; only an explicit `false` disables it.
  return data.value !== false;
}

export async function getCopyrightSettings(): Promise<CopyrightSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'footer_copyright')
    .single();

  if (error || !data) {
    // If you want to handle the "not found" case gracefully,
    // you could return a default value instead of throwing an error.
    console.error('Copyright settings not found:', error);
    return { en: '© {year} Default Copyright. All rights reserved.' };
  }

  return data.value as CopyrightSettings;
}

export async function updateCopyrightSettings(formData: FormData) {
  const supabase = createClient();

  // Check if user is an admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to update settings.');
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !['ADMIN', 'WRITER'].includes(profile.role)) {
    throw new Error('You do not have permission to perform this action.');
  }

  const newSettings: CopyrightSettings = {};
  formData.forEach((value, key) => {
    if (key.startsWith('copyright_')) {
      const langCode = key.replace('copyright_', '');
      newSettings[langCode] = value as string;
    }
  });

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'footer_copyright', value: newSettings });

  if (error) {
    console.error('Error updating copyright settings:', error);
    throw new Error('Failed to update copyright settings.');
  }

  // Persist the footer attribution toggle. The client always submits an explicit
  // 'true'/'false' so an unchecked box is captured (not just omitted).
  const attributionEnabled = formData.get('footer_show_attribution') !== 'false';
  const { error: attributionError } = await supabase
    .from('site_settings')
    .upsert({ key: FOOTER_ATTRIBUTION_KEY, value: attributionEnabled });

  if (attributionError) {
    console.error('Error updating footer attribution setting:', attributionError);
    throw new Error('Failed to update footer attribution setting.');
  }

  // Revalidate the root layout to reflect changes immediately across the site.
  revalidatePath('/', 'layout');

  return { success: true, message: 'Copyright settings updated successfully.' };
}
