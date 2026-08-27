import 'server-only';

import { createClient, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

/**
 * How many messages want attention, for the CMS nav badge.
 *
 * Best-effort in the same shape as the system-alerts loader: any failure — including
 * the tables not existing yet on an install that has not run migration 27 — resolves to
 * zero rather than breaking the whole CMS chrome.
 *
 * Note the two halves count different things. Threads have a real `unread_for_admin`
 * flag. Interactions have no per-user read marker anywhere in the schema, so "pending
 * moderation" stands in for it — which means two admins working the queue see the same
 * number until one of them acts.
 */
export async function getUnreadMessageCount(isAdmin: boolean): Promise<number> {
  try {
    let total = 0;

    if (isAdmin) {
      const service = getServiceRoleSupabaseClient();
      const { count } = await service
        .from('message_threads')
        .select('id', { count: 'exact', head: true })
        .eq('unread_for_admin', true);
      total += count ?? 0;
    }

    const supabase = createClient();
    const { count: pending } = await supabase
      .from('cms_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('parent_id', null);
    total += pending ?? 0;

    return total;
  } catch {
    return 0;
  }
}
