-- Scheduled publishing for pages and products.
--
-- Posts already support scheduling: `posts.published_at` exists and every public
-- read gates on `published_at IS NULL OR published_at <= now()`, so a row with
-- status='published' and a future date is withheld until the date passes. Pages
-- and products had no equivalent column, so "go live on Tuesday" was impossible
-- for them. This adds the same column with the same semantics.
--
-- Visibility is derived from the (status, published_at) PAIR — no new enum value:
--
--   status = draft/archived                      -> not public, whatever the date
--   status = published|active, published_at NULL -> public now
--   status = published|active, date <= now()     -> public now
--   status = published|active, date >  now()     -> SCHEDULED (withheld)
--
-- Deriving "scheduled" instead of storing it keeps `page_status` unchanged (adding
-- an enum value can't be done inside a transaction with other DDL in Postgres) and
-- matches what posts have always done, so one code path covers all three types.
--
-- NULL is the safe default: every existing published row keeps rendering exactly as
-- before, so this migration needs no backfill and changes no current behavior.
--
-- Forward-only and idempotent.

ALTER TABLE public.pages
    ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

COMMENT ON COLUMN public.pages.published_at IS
    'Optional go-live moment. NULL = live as soon as status is published. A future value withholds the page from public reads until it passes (status stays "published"; the CMS renders that pair as "Scheduled").';

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

COMMENT ON COLUMN public.products.published_at IS
    'Optional go-live moment. NULL = live as soon as status is active. A future value withholds the product from public reads until it passes (status stays "active"; the CMS renders that pair as "Scheduled").';

-- Public listing/index queries filter on the (status, published_at) pair together
-- (catalog, sitemap, page lookups), so a composite index serves them in one pass.
CREATE INDEX IF NOT EXISTS pages_status_published_at_idx
    ON public.pages (status, published_at);

CREATE INDEX IF NOT EXISTS products_status_published_at_idx
    ON public.products (status, published_at);
