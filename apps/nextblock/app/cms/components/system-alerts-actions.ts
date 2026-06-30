'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@nextblock-cms/db/server';

/**
 * Mark a system alert resolved (dismiss it from the dashboard banner). Runs as the
 * signed-in user; the system_alerts UPDATE RLS policy restricts this to ADMINs, so a
 * non-admin caller simply updates zero rows. Inserts are service-role only.
 */
export async function resolveSystemAlert(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: 'Missing alert id.' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated.' };

  const { error } = await supabase
    .from('system_alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/cms', 'layout');
  return { ok: true };
}
