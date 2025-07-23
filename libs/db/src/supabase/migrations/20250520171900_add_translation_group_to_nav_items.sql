-- supabase/migrations/YYYYMMDDHHMMSS_add_translation_group_to_nav_items.sql
-- Replace YYYYMMDDHHMMSS with the actual timestamp, e.g., 20250520171700

ALTER TABLE public.navigation_items
ADD COLUMN translation_group_id UUID DEFAULT gen_random_uuid() NOT NULL;

COMMENT ON COLUMN public.navigation_items.translation_group_id IS 'Groups different language versions of the same conceptual navigation item.';

CREATE INDEX IF NOT EXISTS idx_navigation_items_translation_group_id ON public.navigation_items(translation_group_id);

-- Note: For existing navigation items, you will need to manually group them if they are translations of each other.
-- For example, if item ID 5 (EN) and item ID 25 (FR) are the same conceptual link:
-- UPDATE public.navigation_items SET translation_group_id = (SELECT translation_group_id FROM public.navigation_items WHERE id = 5 LIMIT 1) WHERE id = 25;
-- Or, assign a new group ID to both if they weren't grouped yet:
-- WITH new_group AS (SELECT gen_random_uuid() as new_id)
-- UPDATE public.navigation_items
-- SET translation_group_id = (SELECT new_id FROM new_group)
-- WHERE id IN (5, 25);
--
-- It's recommended to do this grouping manually based on your existing data logic.
-- New items created through the updated CMS logic will automatically get grouped.
