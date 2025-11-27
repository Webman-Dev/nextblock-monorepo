BEGIN;

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "blocks_authenticated_comprehensive_select" ON public.blocks;

-- Create the new inclusive policy
CREATE POLICY "blocks_authenticated_comprehensive_select" ON public.blocks
  FOR SELECT
  TO authenticated
  USING (
    -- 1. Admin/Writer can see everything
    ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
    OR
    -- 2. Anyone (including USER or no-role) can see published content
    (
      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
    )
  );

COMMENT ON POLICY "blocks_authenticated_comprehensive_select" ON public.blocks IS 'Comprehensive SELECT policy for authenticated users on the blocks table. Admins/Writers see all. Others (including those with missing profiles) see blocks of published parents.';

COMMIT;
