import type { MetadataRoute } from 'next';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import {
  fetchAllActiveProducts,
  fetchAllPublishedPages,
  fetchAllPublishedPosts,
  type SitemapEntry,
} from './lib/sitemap-utils';

/**
 * Cache the generated sitemap and rebuild it at most once an hour. Crawlers get
 * a fast, statically-served file while newly published pages/posts/products
 * still appear without a redeploy.
 *
 * NextBlock does not enable Next.js Cache Components, so the route-segment
 * `revalidate` config is the idiomatic caching control here (it matches the
 * rest of the app's ISR cadence). If `cacheComponents` were turned on, the
 * equivalent would be a `'use cache'` body paired with `cacheLife('hours')`
 * instead of this export.
 */
export const revalidate = 3600;

type SitemapItem = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapItem['changeFrequency']>;

const BASE_URL = (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');

function toAbsolute(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Maps a language-aware {@link SitemapEntry} onto a Next.js sitemap item. */
function toSitemapItem(
  entry: SitemapEntry,
  changeFrequency: ChangeFrequency,
  priority: number,
): SitemapItem {
  const item: SitemapItem = {
    url: toAbsolute(entry.path),
    lastModified: entry.lastModified,
    changeFrequency,
    priority,
  };

  if (entry.alternates) {
    item.alternates = {
      // Next.js renders this map as <xhtml:link rel="alternate" hreflang=.. href=.. />.
      languages: Object.fromEntries(
        Object.entries(entry.alternates).map(([code, path]) => [code, toAbsolute(path)]),
      ),
    };
  }

  return item;
}

async function safe(
  label: string,
  load: () => Promise<SitemapEntry[]>,
): Promise<SitemapEntry[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Sitemap: failed to load ${label}.`, error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Disposable sandbox deployments should not advertise an indexable sitemap
  // (mirrors the legacy app/sitemap.xml route and app/robots.txt).
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    return [];
  }

  if (!process.env.NEXT_PUBLIC_URL) {
    console.warn(
      'Warning: NEXT_PUBLIC_URL is not set for the sitemap. Defaulting to http://localhost:3000 — set this in production.',
    );
  }

  // Products live behind the premium ecommerce package; their routes 404 when
  // it is inactive (see app/product/[slug]/page.tsx), so only advertise them
  // when the package verifies as active.
  let ecommerceActive = false;
  try {
    ecommerceActive = await verifyPackageOnline('ecommerce');
  } catch (error) {
    console.error('Sitemap: failed to verify the ecommerce package; omitting products.', error);
  }

  const [pages, posts, products] = await Promise.all([
    safe('pages', fetchAllPublishedPages),
    safe('posts', fetchAllPublishedPosts),
    ecommerceActive
      ? safe('products', fetchAllActiveProducts)
      : Promise.resolve<SitemapEntry[]>([]),
  ]);

  // Code-defined route with no row in the content tables. The homepage is served
  // at "/" (its `home`/`accueil` page rows are excluded from the pages query to
  // avoid duplicate URLs).
  const homepage: SitemapItem = {
    url: toAbsolute('/'),
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 1,
  };

  const items: SitemapItem[] = [
    homepage,
    ...pages.map((entry) => toSitemapItem(entry, 'weekly', 0.8)),
    ...posts.map((entry) => toSitemapItem(entry, 'weekly', 0.6)),
    ...products.map((entry) => toSitemapItem(entry, 'daily', 0.7)),
  ];

  // Translations can share a slug (NextBlock has no locale path prefix), so the
  // same URL may surface more than once. Collapse duplicates, keeping the first
  // (highest-priority) occurrence.
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) {
      return false;
    }
    seen.add(item.url);
    return true;
  });
}
