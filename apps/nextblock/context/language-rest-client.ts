import type { Database } from '@nextblock-cms/db';

type Language = Database['public']['Tables']['languages']['Row'];

export async function fetchActiveLanguagesFromRest(): Promise<Language[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const url = new URL('/rest/v1/languages', supabaseUrl);
  url.searchParams.set('select', 'id, code, name, is_default, is_active, created_at, updated_at');
  url.searchParams.set('is_active', 'eq.true');
  url.searchParams.set('order', 'name.asc');

  const response = await fetch(url.toString(), {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}
