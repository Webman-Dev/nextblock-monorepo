-- supabase/migrations/YYYYMMDDHHMMSS_optimize_indexes.sql
-- (Replace YYYYMMDDHHMMSS with the actual timestamp of this migration file, e.g., 20250526185854)

BEGIN;

-- Add indexes for foreign keys in the 'public.blocks' table
CREATE INDEX IF NOT EXISTS idx_blocks_language_id ON public.blocks(language_id);
COMMENT ON INDEX public.idx_blocks_language_id IS 'Index for the foreign key blocks_language_id_fkey on public.blocks.';

CREATE INDEX IF NOT EXISTS idx_blocks_page_id ON public.blocks(page_id);
COMMENT ON INDEX public.idx_blocks_page_id IS 'Index for the foreign key blocks_page_id_fkey on public.blocks.';

CREATE INDEX IF NOT EXISTS idx_blocks_post_id ON public.blocks(post_id);
COMMENT ON INDEX public.idx_blocks_post_id IS 'Index for the foreign key blocks_post_id_fkey on public.blocks.';

-- Add index for foreign key in the 'public.media' table
CREATE INDEX IF NOT EXISTS idx_media_uploader_id ON public.media(uploader_id);
COMMENT ON INDEX public.idx_media_uploader_id IS 'Index for the foreign key media_uploader_id_fkey on public.media.';

-- Add indexes for foreign keys in the 'public.navigation_items' table
CREATE INDEX IF NOT EXISTS idx_navigation_items_language_id ON public.navigation_items(language_id);
COMMENT ON INDEX public.idx_navigation_items_language_id IS 'Index for the foreign key navigation_items_language_id_fkey on public.navigation_items.';

CREATE INDEX IF NOT EXISTS idx_navigation_items_page_id ON public.navigation_items(page_id);
COMMENT ON INDEX public.idx_navigation_items_page_id IS 'Index for the foreign key navigation_items_page_id_fkey on public.navigation_items.';

CREATE INDEX IF NOT EXISTS idx_navigation_items_parent_id ON public.navigation_items(parent_id);
COMMENT ON INDEX public.idx_navigation_items_parent_id IS 'Index for the foreign key navigation_items_parent_id_fkey on public.navigation_items.';

-- Add index for foreign key in the 'public.pages' table
CREATE INDEX IF NOT EXISTS idx_pages_author_id ON public.pages(author_id);
COMMENT ON INDEX public.idx_pages_author_id IS 'Index for the foreign key pages_author_id_fkey on public.pages.';

-- Add indexes for foreign keys in the 'public.posts' table
CREATE INDEX IF NOT EXISTS idx_posts_feature_image_id ON public.posts(feature_image_id);
COMMENT ON INDEX public.idx_posts_feature_image_id IS 'Index for the foreign key fk_feature_image on public.posts.';

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
COMMENT ON INDEX public.idx_posts_author_id IS 'Index for the foreign key posts_author_id_fkey on public.posts.';

-- Remove unused index in 'public.navigation_items' table
-- The linter identified 'idx_navigation_items_translation_group_id' as unused.
-- This index was created in migration 20250520171900_add_translation_group_to_nav_items.sql
DROP INDEX IF EXISTS public.idx_navigation_items_translation_group_id;
-- The COMMENT ON for the dropped index has been removed to prevent the error.

COMMIT;