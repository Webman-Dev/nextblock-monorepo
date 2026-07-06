import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';

// The single, shared definition of "the active logo", used by the public header, the CMS
// branding page, transactional-email branding, and invoices. The operator can pin a
// specific logo (stored as `site_settings.active_logo_id`); when none is pinned we fall
// back to the most recently created logo (the historical default). The setting key is a
// plain, non-secret `site_settings` row, so it is publicly readable under RLS (the public
// header can read it with the anon client) and writable by ADMIN/WRITER.

/** site_settings key holding the admin-selected active logo id (a `logos.id` uuid string). */
export const ACTIVE_LOGO_SETTING_KEY = 'active_logo_id';

// Accept any of the app's Supabase clients (request-scoped, static/anon, or service-role).
type AnyClient = SupabaseClient<Database>;

/** The admin-pinned active logo id, or null when none has been chosen. */
export async function resolveActiveLogoId(client: AnyClient): Promise<string | null> {
  const { data } = await client
    .from('site_settings')
    .select('value')
    .eq('key', ACTIVE_LOGO_SETTING_KEY)
    .maybeSingle();
  const value = data?.value;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Resolve the active logo row (joined with its media) for the given client: the pinned
 * logo when set and still present, otherwise the most recently created logo. Returns the
 * raw row; callers cast to their local logo type. Returns null when there are no logos.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveActiveLogo(client: AnyClient): Promise<any> {
  const activeId = await resolveActiveLogoId(client);

  if (activeId) {
    const { data } = await client
      .from('logos')
      .select('*, media:media_id (*)')
      .eq('id', activeId)
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await client
    .from('logos')
    .select('*, media:media_id (*)')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
