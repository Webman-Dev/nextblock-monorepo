import { createClient } from '@nextblock-cms/db/server';

export type CopyrightSettings = {
  [key: string]: string;
};

export async function getCopyrightSettings(): Promise<CopyrightSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'footer_copyright')
    .single();

  if (error || !data) {
    console.error('Copyright settings not found:', error);
    return { en: 'Ac {year} Default Copyright. All rights reserved.' };
  }

  return data.value as CopyrightSettings;
}
