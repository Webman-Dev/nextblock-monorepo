// app/cms/settings/global-css/actions.ts
'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import type { SettingsActionResult } from '../../../../lib/cms/action-result';

export async function getGlobalCss(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'global_css')
    .single();

  if (error || !data || !data.value) {
    return ''; // Default empty
  }

  // Value is stored as JSONB, but we might have saved it as a raw string or JSON encoded string. 
  // Let's handle both.
  if (typeof data.value === 'string') {
      // If it looks like a JSON string with quotes, parse it
      if (data.value.startsWith('"') && data.value.endsWith('"')) {
          try {
              return JSON.parse(data.value);
          }catch{
              return data.value;
          }
      }
      return data.value;
  }
  
  return String(data.value);
}

export async function updateGlobalCss(css: string): Promise<SettingsActionResult> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be logged in to update settings.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !['ADMIN', 'WRITER'].includes(profile.role)) {
    return { ok: false, error: 'You do not have permission to perform this action.' };
  }

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'global_css', value: css });

  if (error) {
    console.error('Error updating global CSS:', error);
    return { ok: false, error: 'Failed to update CSS.' };
  }

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Global CSS updated successfully.' };
}
