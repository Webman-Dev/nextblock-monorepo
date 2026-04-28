'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient, verifyPackageOnline } from '@nextblock-cms/db/server';

import {
  CORTEX_AI_OPENROUTER_SETTING_KEY,
  CORTEX_AI_PACKAGE_ID,
  encryptStoredOpenRouterApiKey,
  getCortexAiEnvConfig,
  getEnvOpenRouterKeyStatus,
  getStoredOpenRouterKeyStatus,
} from '../../../../lib/ai-config';

const CORTEX_AI_SETTINGS_PATH = '/cms/settings/cortex-ai';

type CortexAiSettingsStatus = {
  activeKeySource: 'env' | 'stored' | 'none';
  hasEncryptionKey: boolean;
  hasEnvOpenRouterKey: boolean;
  hasStoredOpenRouterKey: boolean;
  isPackageActive: boolean;
  maskedEnvOpenRouterKey: string | null;
  maskedStoredOpenRouterKey: string | null;
  storedOpenRouterKeyUpdatedAt: string | null;
};

function redirectWithStatus(status: 'success' | 'error', message: string): never {
  redirect(`${CORTEX_AI_SETTINGS_PATH}?${status}=${encodeURIComponent(message)}`);
}

async function requireAdminSupabaseClient() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in to manage Cortex AI settings.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'ADMIN') {
    throw new Error('You do not have permission to manage Cortex AI settings.');
  }

  return supabase;
}

export async function getCortexAiSettingsStatus(): Promise<CortexAiSettingsStatus> {
  const supabase = await requireAdminSupabaseClient();
  const env = getCortexAiEnvConfig();
  const envKeyStatus = getEnvOpenRouterKeyStatus();

  const [{ data: storedKeyRow }, isPackageActive] = await Promise.all([
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', CORTEX_AI_OPENROUTER_SETTING_KEY)
      .maybeSingle(),
    verifyPackageOnline(CORTEX_AI_PACKAGE_ID).catch(() => false),
  ]);

  const storedKeyStatus = getStoredOpenRouterKeyStatus(storedKeyRow?.value);

  return {
    activeKeySource: env.hasOpenRouterEnvKey
      ? 'env'
      : storedKeyStatus.hasStoredKey
        ? 'stored'
        : 'none',
    hasEncryptionKey: env.hasEncryptionKey,
    hasEnvOpenRouterKey: env.hasOpenRouterEnvKey,
    hasStoredOpenRouterKey: storedKeyStatus.hasStoredKey,
    isPackageActive,
    maskedEnvOpenRouterKey: envKeyStatus.maskedEnvOpenRouterKey,
    maskedStoredOpenRouterKey: storedKeyStatus.maskedKey,
    storedOpenRouterKeyUpdatedAt: storedKeyStatus.updatedAt,
  };
}

export async function saveOpenRouterApiKeyAction(formData: FormData) {
  try {
    const supabase = await requireAdminSupabaseClient();
    const apiKey = String(formData.get('openrouter_api_key') || '').trim();

    if (!apiKey) {
      throw new Error('OpenRouter API key is required.');
    }

    const encryptedKey = encryptStoredOpenRouterApiKey(apiKey);
    const { error } = await supabase.from('site_settings').upsert({
      key: CORTEX_AI_OPENROUTER_SETTING_KEY,
      value: encryptedKey,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirectWithStatus(
      'error',
      error instanceof Error ? error.message : 'Failed to save OpenRouter key.'
    );
  }

  revalidatePath(CORTEX_AI_SETTINGS_PATH);
  redirectWithStatus('success', 'OpenRouter key saved.');
}

export async function clearOpenRouterApiKeyAction() {
  try {
    const supabase = await requireAdminSupabaseClient();
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .eq('key', CORTEX_AI_OPENROUTER_SETTING_KEY);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirectWithStatus(
      'error',
      error instanceof Error ? error.message : 'Failed to clear OpenRouter key.'
    );
  }

  revalidatePath(CORTEX_AI_SETTINGS_PATH);
  redirectWithStatus('success', 'Stored OpenRouter key cleared.');
}
