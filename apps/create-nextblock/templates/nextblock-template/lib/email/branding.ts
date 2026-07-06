import 'server-only';

import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

import { getSiteSettings } from '../../app/lib/site-settings';
import { DEFAULT_SITE_TITLE } from '../../app/lib/seo';
import { resolveMediaUrl } from '../media/resolveMediaUrl';
import { resolveMediaBaseUrl } from '../storage/provider';
import { resolveSiteUrl } from '../site-url';
import { resolveActiveLogo } from '../logos/active-logo';
import { pickEmailLogoObjectKey } from './branding-format';
import type { EmailBranding, LogoMediaLike } from './branding-format';

// Server-side resolution of the tenant branding that white-labels every transactional
// email. The mailer choke point (app/actions/email.ts) and the auth-email logo endpoint
// (app/api/brand/email-logo) both read this, so every dispatched pipeline — 2FA codes,
// form/interaction notifications, the SMTP test, feedback, and the Supabase auth emails —
// shows the operator's own logo instead of a hardcoded NextBlock one.
//
// The pure header-rendering helpers live in ./branding-format (no server-only imports, so
// they're unit-testable); re-export them here so callers have a single import surface.
export {
  EMAIL_BRAND_HEADER_TOKEN,
  EMAIL_LOGO_MAX_WIDTH,
  applyEmailBranding,
  renderEmailBrandHeader,
} from './branding-format';
export type { EmailBranding } from './branding-format';

/**
 * Resolve the tenant's active logo to an ABSOLUTE URL usable in an email `<img>`.
 * The newest `logos` row wins (the table has no is_active flag). Returns `null` when
 * there is no logo, no linked media, or the URL cannot be resolved — the caller then
 * renders a text banner instead.
 */
async function resolveActiveLogoUrl(): Promise<string | null> {
  try {
    const supabase = getServiceRoleSupabaseClient();
    // Honor the admin-pinned active logo (site_settings.active_logo_id), else newest.
    const logo = await resolveActiveLogo(supabase);
    const media = (logo as { media?: LogoMediaLike | null } | null)?.media ?? null;
    // Prefer the original uploaded file over the AVIF `object_key` (email can't render AVIF).
    const objectKey = pickEmailLogoObjectKey(media);
    if (!objectKey) return null;

    // Pass the resolved base explicitly so the native-Supabase storage URL is honored
    // even when NEXT_PUBLIC_R2_BASE_URL isn't set.
    const resolved = resolveMediaUrl(objectKey, resolveMediaBaseUrl());
    if (!resolved) return null;
    if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
      return resolved;
    }
    // Relative result (a bundled `/images/*` key, or the no-storage-base case): make it
    // absolute against the public site origin so email clients can fetch it.
    const origin = resolveSiteUrl();
    return `${origin}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
  } catch {
    // Service role unavailable or table missing (pre-setup) — treat as "no logo".
    return null;
  }
}

/**
 * Resolve tenant email branding. Read fresh on each call (no React `cache`, so it is safe
 * from fire-and-forget dispatch paths where the request scope may already be torn down);
 * the underlying site-settings read is already cross-request cached via `unstable_cache`,
 * and a fresh read each time is what keeps the logo "change at will".
 */
export async function resolveEmailBranding(): Promise<EmailBranding> {
  const [settings, logoUrl] = await Promise.all([
    getSiteSettings().catch(() => null),
    resolveActiveLogoUrl(),
  ]);
  const siteName = settings?.siteTitle?.trim() || DEFAULT_SITE_TITLE;
  return { logoUrl, siteName };
}
