import { NextResponse } from 'next/server';
import { createClient } from '@nextblock-cms/db/server';
import { refreshUpstreamStatus } from '../../../../lib/updates/check-upstream';

// Node runtime: the update checker reads the filesystem (.git / workflow detection) and
// uses the service-role client. force-dynamic so it never gets statically cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Authenticated ADMIN gate, mirroring lib/full-backup/server.ts. */
async function requireAdmin(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'Not authenticated.';

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || profile?.role !== 'ADMIN') return 'Administrator role required.';
  return null;
}

/**
 * Admin-triggered upstream update check (Track B). Polls the GitHub Releases API,
 * compares versions, and — on a standalone install — records a runtime_update_available
 * alert. Returns the comparison either way so an admin "Check for updates" control can
 * show the result inline.
 */
export async function POST() {
  const denied = await requireAdmin();
  if (denied) {
    return NextResponse.json({ ok: false, error: denied }, { status: 401 });
  }

  const { update, conflicts, snapshot } = await refreshUpstreamStatus();
  // The check itself succeeded as an operation even if a network call failed; surface any
  // soft error in the body rather than 500ing the admin action.
  const ok = update.ok && conflicts.ok;
  return NextResponse.json({ ok, update, conflicts, snapshot }, { status: ok ? 200 : 502 });
}
