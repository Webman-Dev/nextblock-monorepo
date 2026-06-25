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
