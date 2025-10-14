import { createClient } from '@nextblock-cms/db/server';

export async function getTranslations() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('translations')
    .select('key, translations, created_at, updated_at')
    .order('key');

  if (error) {
    console.error('Error fetching translations:', error);
    return [];
  }

  return data;
}
