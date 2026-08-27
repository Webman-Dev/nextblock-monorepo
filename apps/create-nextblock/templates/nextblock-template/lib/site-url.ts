// Resolve the canonical public site URL across deploy channels WITHOUT requiring
// NEXT_PUBLIC_URL to be set. On Vercel it falls back to the auto-provisioned
// production URL, so a one-click deploy needs no URL input at all.
//
// Dependency-free and safe to import anywhere — server components, route handlers,
// or client components — like lib/setup/env-status.ts. It only reads `process.env`:
// NEXT_PUBLIC_* names are inlined into the browser bundle at build time, the others
// resolve server-side only (and are simply absent — harmless — in the browser).

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/**
 * Vercel always sets a production domain (even on preview deployments):
 * `VERCEL_PROJECT_PRODUCTION_URL` server-side, and Vercel exposes the
 * framework-prefixed `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` to the browser
 * bundle at build time. Neither includes the protocol. We prefer the production URL
 * over the per-deployment `VERCEL_URL` so absolute links (sitemap, canonical, OG)
 * stay stable across deploys.
 */
function vercelProductionUrl(): string {
  const host =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return host ? `https://${stripTrailingSlash(host)}` : '';
}

/**
 * Canonical absolute site origin (e.g. `https://example.com`), no trailing slash.
 * Precedence: explicit `NEXT_PUBLIC_URL` → Vercel production URL → `fallback`.
 */
export function resolveSiteUrl(fallback = 'http://localhost:3000'): string {
  const explicit = process.env.NEXT_PUBLIC_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const vercel = vercelProductionUrl();
  if (vercel) return vercel;

  return stripTrailingSlash(fallback);
}

/**
 * True when a real, production-intended site URL is available (an explicit
 * `NEXT_PUBLIC_URL` or the Vercel production URL) — i.e. {@link resolveSiteUrl}
 * is NOT returning the local-dev fallback. Use this to gate "URL not set" warnings.
 */
export function hasResolvedSiteUrl(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_URL?.trim() || vercelProductionUrl());
}

/**
 * Whether the resolved site URL is one a stranger could actually open.
 *
 * `resolveSiteUrl()` falls back to http://localhost:3000 when nothing is configured,
 * which is correct for rendering local links but catastrophic in an email: the
 * recipient gets a dead button, and — because a non-routable host under a plain http
 * scheme alongside a long opaque token reads exactly like phishing — the message is
 * likely to be quarantined before they even see it. Anything that mails a link out
 * must check this first.
 */
export function isPubliclyRoutableSiteUrl(url: string = resolveSiteUrl()): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.localhost') ||
      // RFC1918 / link-local: reachable on someone's LAN, never from an inbox.
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return false;
    }

    // A bare hostname with no dot cannot be resolved from outside this network.
    return host.includes('.');
  } catch {
    return false;
  }
}

/**
 * Whether the site URL was actually chosen by the operator, rather than invented.
 *
 * This is the distinction that matters before mailing a link. A `localhost` URL is
 * perfectly workable when the person reading the mail is on the machine running the
 * server — that is an ordinary way to test. What is not workable is `resolveSiteUrl()`
 * quietly inventing `http://localhost:3000` because nothing was configured, and a link
 * to it going out to a real customer.
 *
 * So: honour an explicit choice, refuse an accidental default.
 */
export function hasExplicitSiteUrl(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_URL?.trim() || vercelProductionUrl());
}
