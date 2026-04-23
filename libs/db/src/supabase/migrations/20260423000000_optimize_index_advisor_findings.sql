-- 20260423000000_optimize_index_advisor_findings.sql
-- Applies safe index optimizations based on Supabase Performance Advisor:
-- add missing FK indexes and remove only schema-redundant indexes.

BEGIN;

-- 1. Add covering indexes for foreign keys flagged by the advisor.
CREATE INDEX IF NOT EXISTS idx_logos_media_id
  ON public.logos (media_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_page_revisions_author_id
  ON public.page_revisions (author_id);

CREATE INDEX IF NOT EXISTS idx_post_revisions_author_id
  ON public.post_revisions (author_id);

CREATE INDEX IF NOT EXISTS idx_product_media_media_id
  ON public.product_media (media_id);

CREATE INDEX IF NOT EXISTS idx_shipping_zone_methods_zone_id
  ON public.shipping_zone_methods (zone_id);

-- 2. Remove indexes that are redundant by schema definition.
-- The composite (page_id, version) index covers page_id lookups.
DROP INDEX IF EXISTS public.idx_page_revisions_page_id;

-- The composite (post_id, version) index covers post_id lookups.
DROP INDEX IF EXISTS public.idx_post_revisions_post_id;

-- The PRIMARY KEY on (variant_id, attribute_term_id) already covers variant_id.
DROP INDEX IF EXISTS public.idx_variant_attribute_mapping_variant_id;

COMMIT;
