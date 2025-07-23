-- supabase/migrations/YYYYMMDDHHMMSS_add_translation_group_id.sql

ALTER TABLE public.pages
ADD COLUMN translation_group_id UUID DEFAULT gen_random_uuid() NOT NULL;

COMMENT ON COLUMN public.pages.translation_group_id IS 'Groups different language versions of the same conceptual page.';

CREATE INDEX IF NOT EXISTS idx_pages_translation_group_id ON public.pages(translation_group_id);

-- For existing pages, you'll need to manually group them.
-- Example: If page ID 1 (EN) and page ID 10 (FR) are the same conceptual page:
-- UPDATE public.pages SET translation_group_id = (SELECT translation_group_id FROM public.pages WHERE id = 1) WHERE id = 10;
-- Or, for all pages that share a slug currently (from the previous model):
-- WITH slug_groups AS (
--   SELECT slug, MIN(id) as first_id, gen_random_uuid() as new_group_id
--   FROM public.pages
--   GROUP BY slug
--   HAVING COUNT(*) > 1 -- Only for slugs that were shared
-- )
-- UPDATE public.pages p
-- SET translation_group_id = sg.new_group_id
-- FROM slug_groups sg
-- WHERE p.slug = sg.slug;
--
-- UPDATE public.pages p
-- SET translation_group_id = gen_random_uuid()
-- WHERE p.translation_group_id IS NULL AND EXISTS (
--   SELECT 1 FROM (
--     SELECT slug, COUNT(*) as c FROM public.pages GROUP BY slug
--   ) counts WHERE counts.slug = p.slug AND counts.c = 1
-- );


ALTER TABLE public.posts
ADD COLUMN translation_group_id UUID DEFAULT gen_random_uuid() NOT NULL;

COMMENT ON COLUMN public.posts.translation_group_id IS 'Groups different language versions of the same conceptual post.';

CREATE INDEX IF NOT EXISTS idx_posts_translation_group_id ON public.posts(translation_group_id);