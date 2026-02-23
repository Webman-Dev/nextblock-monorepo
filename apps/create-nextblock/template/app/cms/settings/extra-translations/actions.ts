'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const translationSchema = z.object({
  key: z.string().min(1, 'Key is required.'),
  en: z.string().min(1, 'English translation is required.'),
});

export async function createTranslation(prevState: unknown, formData: FormData) {
  const supabase = createClient();
  const data = {
    key: formData.get('key') as string,
    en: formData.get('en') as string,
  };

  const validatedFields = translationSchema.safeParse({
    key: data.key,
    en: data.en,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase.from('translations').insert({
    key: validatedFields.data.key,
    translations: { en: validatedFields.data.en },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidatePath('/cms/settings/extra-translations');

  return {
    success: true,
  };
}

export async function getTranslations() {
  const supabase = createClient();
  const { data, error } = await supabase.from('translations').select('key, translations, created_at, updated_at').order('key');

  if (error) {
    console.error('Error fetching translations:', error);
    return [];
  }

  return data;
}

export async function updateTranslation(prevState: unknown, formData: FormData) {
  const supabase = createClient();
  const data = Object.fromEntries(formData as any);
  const key = data.key as string;

  if (!key) {
    return {
      error: 'Translation key is required',
    };
  }

  // First, fetch the existing translation to get current translations
  const { data: existingData, error: fetchError } = await supabase
    .from('translations')
    .select('translations')
    .eq('key', key)
    .single();

  if (fetchError) {
    return {
      error: `Failed to fetch existing translation: ${fetchError.message}`,
    };
  }

  // Merge new translations with existing ones
  const existingTranslations = (existingData?.translations as Record<string, string>) || {};
  const newTranslations: { [key: string]: string } = { ...existingTranslations };
  
  for (const [formKey, value] of Object.entries(data)) {
    if (formKey !== 'key') {
      newTranslations[formKey] = value as string;
    }
  }

  const { data: updateResult, error } = await supabase
    .from('translations')
    .update({ translations: newTranslations })
    .eq('key', key)
    .select();

  if (error) {
    return {
      error: error.message,
    };
  }

  if (!updateResult || updateResult.length === 0) {
    return {
      error: `Translation with key "${key}" not found or could not be updated`,
    };
  }

  revalidatePath('/cms/settings/extra-translations');

  return {
    success: true,
  };
}