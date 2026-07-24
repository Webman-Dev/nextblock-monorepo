import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';

/**
 * The homepage is the default-language page at slug "home". Every one of its
 * translation-group siblings — whatever slug each one uses (e.g. "accueil",
 * "startseite", "inicio") — is ALSO served at "/". This returns that shared
 * `translation_group_id` so callers can recognise every language variation of
 * the homepage instead of hardcoding per-locale slugs.
 *
 * Returns `null` when there is no default-language "home" page (e.g. a fresh
 * install), in which case callers should fall back to their prior slug-literal
 * behaviour.
 */
export async function getHomepageTranslationGroupId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const { data: defaultLang } = await supabase
    .from('languages')
    .select('id')
    .eq('is_default', true)
    .maybeSingle();

  if (!defaultLang) {
    return null;
  }

  const { data: home } = await supabase
    .from('pages')
    .select('translation_group_id')
    .eq('slug', 'home')
    .eq('language_id', defaultLang.id)
    .maybeSingle();

  return home?.translation_group_id ?? null;
}
