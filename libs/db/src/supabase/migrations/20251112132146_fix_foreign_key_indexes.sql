BEGIN;

-- Add missing coverage for frequently joined foreign keys.
CREATE INDEX IF NOT EXISTS idx_logos_media_id
  ON public.logos (media_id);

CREATE INDEX IF NOT EXISTS idx_page_revisions_author_id
  ON public.page_revisions (author_id);

CREATE INDEX IF NOT EXISTS idx_post_revisions_author_id
  ON public.post_revisions (author_id);

-- Drop unused or redundant indexes called out by Supabase insights.
DROP INDEX IF EXISTS idx_page_revisions_page_id_version;
DROP INDEX IF EXISTS idx_post_revisions_post_id_version;
DROP INDEX IF EXISTS idx_post_revisions_post_id;
DROP INDEX IF EXISTS idx_pages_translation_group_id;
DROP INDEX IF EXISTS idx_posts_translation_group_id;
DROP INDEX IF EXISTS idx_navigation_items_menu_lang_order;

COMMIT;
