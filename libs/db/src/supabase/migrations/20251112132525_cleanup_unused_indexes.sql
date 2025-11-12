BEGIN;

-- Drop redundant or legacy indexes highlighted by Supabase Advisor.
DROP INDEX IF EXISTS media_folder_idx;
DROP INDEX IF EXISTS idx_blocks_language_id;
DROP INDEX IF EXISTS idx_blocks_post_id;
DROP INDEX IF EXISTS idx_navigation_items_language_id;
DROP INDEX IF EXISTS idx_page_revisions_page_id;

COMMIT;
