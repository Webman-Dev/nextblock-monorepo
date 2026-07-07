'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient, verifyPackageOnline } from '@nextblock-cms/db/server';

import {
  CORTEX_AI_OPENROUTER_MODEL_SELECTION_SETTING_KEY,
  CORTEX_AI_OPENROUTER_SETTING_KEY,
  CORTEX_AI_PACKAGE_ID,
  createCortexAiStoredModelSelection,
  encryptStoredOpenRouterApiKey,
  getCortexAiEnvConfig,
  getEnvOpenRouterKeyStatus,
  getStoredOpenRouterKeyStatus,
  listCortexAiCompatibleOpenRouterModels,
  safeParseCortexAiModelSelection,
  type CortexAiStoredModelSelection,
} from '@nextblock-cms/cortex';

const CORTEX_AI_SETTINGS_PATH = '/cms/settings/cortex-ai';

type CortexAiSettingsStatus = {
  activeKeySource: 'env' | 'stored' | 'none';
  hasEncryptionKey: boolean;
  hasEnvOpenRouterKey: boolean;
  hasStoredOpenRouterKey: boolean;
  isPackageActive: boolean;
  maskedEnvOpenRouterKey: string | null;
  maskedStoredOpenRouterKey: string | null;
  selectedModel: CortexAiStoredModelSelection | null;
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

  const [{ data: storedKeyRow }, { data: selectedModelRow }, isPackageActive] = await Promise.all([
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', CORTEX_AI_OPENROUTER_SETTING_KEY)
      .maybeSingle(),
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', CORTEX_AI_OPENROUTER_MODEL_SELECTION_SETTING_KEY)
      .maybeSingle(),
    verifyPackageOnline(CORTEX_AI_PACKAGE_ID).catch(() => false),
  ]);

  const storedKeyStatus = getStoredOpenRouterKeyStatus(storedKeyRow?.value);
  const selectedModel = safeParseCortexAiModelSelection(selectedModelRow?.value);

  return {
    activeKeySource: storedKeyStatus.hasStoredKey
      ? 'stored'
      : env.hasOpenRouterEnvKey
        ? 'env'
        : 'none',
    hasEncryptionKey: env.hasEncryptionKey,
    hasEnvOpenRouterKey: env.hasOpenRouterEnvKey,
    hasStoredOpenRouterKey: storedKeyStatus.hasStoredKey,
    isPackageActive,
    maskedEnvOpenRouterKey: envKeyStatus.maskedEnvOpenRouterKey,
    maskedStoredOpenRouterKey: storedKeyStatus.maskedKey,
    selectedModel: storedKeyStatus.hasStoredKey ? selectedModel : null,
    storedOpenRouterKeyUpdatedAt: storedKeyStatus.updatedAt,
  };
}

export async function saveOpenRouterApiKeyAction(formData: FormData) {
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    throw new Error('Sandbox environment cannot save keys to the database.');
  }

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
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    throw new Error('Sandbox environment cannot clear keys from the database.');
  }

  try {
    const supabase = await requireAdminSupabaseClient();
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .in('key', [
        CORTEX_AI_OPENROUTER_SETTING_KEY,
        CORTEX_AI_OPENROUTER_MODEL_SELECTION_SETTING_KEY,
      ]);

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

export async function saveCortexAiModelSelectionAction(formData: FormData) {
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    throw new Error('Sandbox environment cannot save model selection to the database.');
  }

  try {
    const supabase = await requireAdminSupabaseClient();
    const modelId = String(formData.get('openrouter_model_id') || '').trim();

    if (!modelId) {
      throw new Error('Choose an OpenRouter model before saving.');
    }

    const { data: storedKeyRow, error: storedKeyError } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', CORTEX_AI_OPENROUTER_SETTING_KEY)
      .maybeSingle();

    if (storedKeyError) {
      throw new Error(storedKeyError.message);
    }

    const storedKeyStatus = getStoredOpenRouterKeyStatus(storedKeyRow?.value);

    if (!storedKeyStatus.hasStoredKey) {
      throw new Error('Save a stored OpenRouter BYOK before choosing a paid model.');
    }

    const compatibleModels = await listCortexAiCompatibleOpenRouterModels();
    const selectedModel = compatibleModels.find((model) => model.id === modelId);

    if (!selectedModel) {
      throw new Error(
        'The selected model is no longer eligible for Cortex AI structured output and tool calling.'
      );
    }

    const { error } = await supabase.from('site_settings').upsert({
      key: CORTEX_AI_OPENROUTER_MODEL_SELECTION_SETTING_KEY,
      value: createCortexAiStoredModelSelection(selectedModel),
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirectWithStatus(
      'error',
      error instanceof Error ? error.message : 'Failed to save Cortex AI model selection.'
    );
  }

  revalidatePath(CORTEX_AI_SETTINGS_PATH);
  redirectWithStatus('success', 'Cortex AI model selection saved.');
}

export async function clearCortexAiModelSelectionAction() {
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    throw new Error('Sandbox environment cannot clear model selection from the database.');
  }

  try {
    const supabase = await requireAdminSupabaseClient();
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .eq('key', CORTEX_AI_OPENROUTER_MODEL_SELECTION_SETTING_KEY);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirectWithStatus(
      'error',
      error instanceof Error ? error.message : 'Failed to clear Cortex AI model selection.'
    );
  }

  revalidatePath(CORTEX_AI_SETTINGS_PATH);
  redirectWithStatus('success', 'Cortex AI model selection cleared.');
}
