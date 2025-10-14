import { createClient } from '@nextblock-cms/db/server';
import type { Logo } from './types';

export async function getLogos(): Promise<Logo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('logos')
    .select('id, name, is_active, created_at, updated_at, media_id, media(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getLogos] Error fetching logos:', error);
    return [];
  }

  return data as unknown as Logo[];
}

export async function getLogoById(id: string): Promise<Logo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('logos')
    .select('id, name, is_active, created_at, updated_at, media_id, media(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getLogoById] Error fetching logo:', error);
    return null;
  }

  return data as unknown as Logo;
}

export async function getActiveLogo(): Promise<Logo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('logos')
    .select('id, name, is_active, media_id, media(*)')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getActiveLogo] Error fetching active logo:', error);
    return null;
  }

  return data as unknown as Logo | null;
}
