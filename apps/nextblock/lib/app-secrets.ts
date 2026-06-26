import 'server-only';
import { createHmac } from 'node:crypto';

// Resolve the app's internal shared secrets WITHOUT requiring the operator to paste
// random strings at deploy time. When an explicit env var is set it always wins;
// otherwise the secret is derived deterministically from the always-present Supabase
// service-role key. This is what lets a one-click Vercel deploy work with zero env
// input while Draft Mode and on-demand revalidation still function out of the box.
//
// HMAC-SHA256 is one-way, so a leaked derived secret never exposes the service-role
// key. The derived value is stable for a given Supabase project; rotating the
// service-role key rotates these secrets too (set the explicit env var to pin one
// independently — e.g. to configure a Supabase revalidation webhook with a fixed
// token). `npm run setup` still writes explicit values locally, so dev is unchanged.
//
// CRON_SECRET is intentionally NOT derived here: Vercel Cron injects
// `Authorization: Bearer ${process.env.CRON_SECRET}` read from the env at invocation,
// so a derived value could never match it. The cron routes instead treat CRON_SECRET
// as optional (enforced only when set) — see app/api/cron/*/route.ts.

function deriveFromServiceRole(label: string): string {
  // Accept the Marketplace integration's SUPABASE_SECRET_KEY alias too, so derivation
  // still works on a one-click deploy that only injected the new key name.
  const master = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  )?.trim();
  if (!master) return '';
  return createHmac('sha256', master).update(`nextblock:${label}`).digest('hex');
}

/** Secret for the programmatic Draft Mode preview entry (`/api/draft?secret=`). */
export function resolveDraftModeSecret(): string {
  return process.env.DRAFT_MODE_SECRET?.trim() || deriveFromServiceRole('draft-mode');
}

/** Shared secret a Supabase webhook sends to `/api/revalidate` (`x-revalidate-secret`). */
export function resolveRevalidateSecret(): string {
  return process.env.REVALIDATE_SECRET_TOKEN?.trim() || deriveFromServiceRole('revalidate');
}
