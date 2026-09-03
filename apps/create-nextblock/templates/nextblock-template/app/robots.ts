import type { MetadataRoute } from 'next';
import { getSsgSupabaseClient } from '@nextblock-cms/db/server';
import { normalizeRobotsSettings, type RobotsSettings } from '@nextblock-cms/utils/seo';
import { buildRobotsMetadata } from '../lib/seo/robots-txt';
import { resolveSiteUrl, hasResolvedSiteUrl } from '../lib/site-url';

/**
 * /robots.txt, generated from the operator's stored settings.
 *
 * This replaces the hand-rolled `app/robots.txt/route.ts` that used to live here,
 * and the two CANNOT coexist: Next's `normalizeMetadataRoute` rewrites the page
 * `/robots` to `/robots.txt` and then appends `/route`, which is character for
 * character the app path the old handler occupied. Keeping both would be a
 * duplicate-route collision, not a fallback — so the old file was deleted in the
 * same change that added this one. The externally visible path is unchanged, which
 * is why `isSetupAllowlisted()` in proxy.ts still allowlists the literal
 * '/robots.txt' and needed no edit.
 *
 * The move from a route handler to the metadata route is what buys the caching
 * below. Everything else about the response — the served path, the content type, the
 * sandbox behaviour — is identical to what shipped before.
 */

/**
 * Cache the generated file and rebuild it at most once an hour, mirroring
 * app/sitemap.ts. Crawlers get a fast, statically-served response while a change an
 * operator saves in /cms/settings still takes effect without a redeploy.
 *
 * NextBlock does not enable Next.js Cache Components, so the route-segment
 * `revalidate` config is the idiomatic caching control here. If `cacheComponents`
 * were turned on, the equivalent would be a `'use cache'` body paired with
 * `cacheLife('hours')` instead of this export.
 */
export const revalidate = 3600;

/**
 * The `site_settings` row the SEO screen writes, seeded by migration 30 and moved into
 * the ADMIN-only write group by migration 31 — a WRITER could otherwise have PATCHed
 * this row through PostgREST and de-indexed the whole site, since RLS, not the server
 * action, is the boundary that actually holds.
 */
const ROBOTS_SETTINGS_KEY = 'seo_robots_settings';

/**
 * Reads the stored robots configuration, falling back to the permissive defaults on
 * any failure whatsoever.
 *
 * The anon client is the right one here, and deliberately so: `seo_robots_settings`
 * is a non-secret key and `site_settings`' read policy is already public for
 * non-secret keys, so nothing on this path needs the service role. Handing a
 * service-role client to a route that anonymous crawlers hit would be a needless
 * escalation.
 *
 * That read has to stay anonymous, which is why migration 31 tightened only the
 * INSERT/UPDATE/DELETE policies and left `site_settings_read_policy` alone. Adding
 * this key to the read policy's sensitive array would not fail loudly — the query
 * below would simply return no row, every crawler would be served the permissive
 * defaults, and the operator's configuration would stop applying without a single
 * error anywhere.
 *
 * The failure handling matters more than it looks. A crawler that receives a 500 for
 * robots.txt may treat the entire site as disallowed until it next succeeds, so an
 * unreachable database — or a `cms_redirects`-era install that has not yet run
 * `npm run db:migrate`, where this settings row does not exist — must produce a
 * valid, permissive file rather than an error. `normalizeRobotsSettings` handles the
 * other half of that: whatever jsonb hands back, including null, a string or a
 * half-migrated object, becomes a complete `RobotsSettings`.
 */
async function loadRobotsSettings(): Promise<RobotsSettings> {
  try {
    const supabase = getSsgSupabaseClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', ROBOTS_SETTINGS_KEY)
      .maybeSingle();

    if (error) {
      console.error('robots.txt: failed to read the robots settings; serving defaults.', error);
      return normalizeRobotsSettings(undefined);
    }

    // A missing row is not an error — it is a site whose operator has never opened
    // the SEO screen — and the defaults are exactly what that site should serve.
    return normalizeRobotsSettings(data?.value);
  } catch (error) {
    console.error('robots.txt: robots settings lookup threw; serving defaults.', error);
    return normalizeRobotsSettings(undefined);
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';

  // The sandbox answer ignores every stored setting, so there is nothing to read.
  // Skipping the query keeps a disposable deployment's robots.txt working even when
  // its database is asleep or being reset by the cron job. The reasoning for why the
  // sandbox ALLOWS crawling rather than disallowing it lives on SANDBOX_USER_AGENT_RULE
  // in lib/seo/robots-txt.ts — it is the counter-intuitive part of this feature and
  // that is where it is written down in full.
  if (isSandbox) {
    return buildRobotsMetadata(normalizeRobotsSettings(undefined), {
      isSandbox: true,
      sitemapUrl: null,
    });
  }

  // Explicit NEXT_PUBLIC_URL → Vercel production URL → local-dev fallback.
  const siteUrl = resolveSiteUrl();

  if (!hasResolvedSiteUrl()) {
    console.warn(
      'Warning: no site URL is set for robots.txt (NEXT_PUBLIC_URL / Vercel production URL). Defaulting to http://localhost:3000. Set NEXT_PUBLIC_URL for production.'
    );
  }

  const settings = await loadRobotsSettings();

  return buildRobotsMetadata(settings, {
    isSandbox: false,
    sitemapUrl: `${siteUrl}/sitemap.xml`,
  });
}
