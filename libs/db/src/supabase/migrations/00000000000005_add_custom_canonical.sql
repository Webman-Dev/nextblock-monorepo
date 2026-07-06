-- Add a nullable `custom_canonical` column to pages, posts and products.
--
-- This is the per-content manual canonical override used by each route's
-- generateMetadata(): when set, it wins over the default self-referencing
-- `<site_url>/<slug>` canonical (see app/lib/seo.ts buildCanonicalUrl). NULL/empty
-- keeps the self-referencing default, so existing rows are unaffected.
--
-- Forward-only and idempotent (ADD COLUMN IF NOT EXISTS). No backfill: a NULL value
-- is the "use the default canonical" sentinel.

ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS custom_canonical text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS custom_canonical text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_canonical text;
