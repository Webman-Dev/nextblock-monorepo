// app/cms/settings/bot-protection/actions.ts
'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import type { SettingsActionResult } from '../../../../lib/cms/action-result';

export type BotProtectionSettings = {
  provider: 'none' | 'turnstile' | 'recaptcha';
  siteKey: string;
  secretKey?: string;
};

export async function getBotProtectionSettings(): Promise<BotProtectionSettings> {
  const supabase = createClient();

  // Fetch public settings
  const { data: publicData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'bot_protection_public')
    .maybeSingle();

  // Fetch secret settings (only accessible by ADMIN role due to our RLS policy)
  const { data: secretData } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'bot_protection_secret')
    .maybeSingle();

  const publicVal = (publicData?.value || {}) as Record<string, any>;
  const secretVal = (secretData?.value || {}) as Record<string, any>;

  return {
    provider: (publicVal.provider as any) || 'none',
    siteKey: publicVal.siteKey || '',
    secretKey: secretVal.secretKey || '',
  };
}

export async function updateBotProtectionSettings(
  formData: FormData,
): Promise<SettingsActionResult> {
  const supabase = createClient();

  // Verify auth and role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be logged in to update settings.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'ADMIN') {
    return { ok: false, error: 'You do not have permission to perform this action.' };
  }

  const provider = formData.get('provider') as 'none' | 'turnstile' | 'recaptcha';
  const siteKey = formData.get('siteKey') as string;
  const secretKey = formData.get('secretKey') as string;

  // Update public settings (provider and siteKey)
  const { error: publicError } = await supabase
    .from('site_settings')
    .upsert({
      key: 'bot_protection_public',
      value: { provider, siteKey },
    });

  if (publicError) {
    console.error('Error updating public bot protection settings:', publicError);
    return { ok: false, error: 'Failed to update bot protection settings.' };
  }

  // Update secret settings (secretKey)
  const { error: secretError } = await supabase
    .from('site_settings')
    .upsert({
      key: 'bot_protection_secret',
      value: { secretKey },
    });

  if (secretError) {
    console.error('Error updating secret bot protection settings:', secretError);
    return { ok: false, error: 'Failed to update bot protection secrets.' };
  }

  // Revalidate root layout so scripts update instantly
  revalidatePath('/', 'layout');

  return { ok: true, message: 'Bot protection settings updated successfully.' };
}
