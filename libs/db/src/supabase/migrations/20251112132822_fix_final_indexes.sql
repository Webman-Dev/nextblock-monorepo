BEGIN;

CREATE INDEX IF NOT EXISTS idx_blocks_language_id
  ON public.blocks (language_id);

CREATE INDEX IF NOT EXISTS idx_blocks_post_id
  ON public.blocks (post_id);

CREATE INDEX IF NOT EXISTS idx_navigation_items_language_id
  ON public.navigation_items (language_id);

ANALYZE VERBOSE;

COMMIT;
