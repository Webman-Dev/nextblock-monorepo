-- Fix blocks RLS policy to resolve joined query issues
-- Replace public.get_current_user_role() with direct EXISTS queries

BEGIN;

-- Drop the existing comprehensive SELECT policy that uses the problematic function
DROP POLICY IF EXISTS "blocks_authenticated_comprehensive_select" ON public.blocks;

-- Drop the existing management policies that use the problematic function
DROP POLICY IF EXISTS "blocks_admin_writer_can_insert" ON public.blocks;
DROP POLICY IF EXISTS "blocks_admin_writer_can_update" ON public.blocks;
DROP POLICY IF EXISTS "blocks_admin_writer_can_delete" ON public.blocks;

-- Create a new comprehensive SELECT policy using direct EXISTS queries
CREATE POLICY "blocks_authenticated_comprehensive_select" ON public.blocks
  FOR SELECT
  TO authenticated
  USING (
    (
      -- Condition for ADMIN or WRITER: they can read ALL blocks
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER'))
    ) OR
    (
      -- Condition for USER: they can read blocks of published parents
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'USER') AND
      (
        (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
        (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
      )
    )
  );
COMMENT ON POLICY "blocks_authenticated_comprehensive_select" ON public.blocks IS 'Comprehensive SELECT policy for authenticated users on the blocks table, differentiating access by role (ADMIN/WRITER see all, USER sees blocks of published parents). Uses direct EXISTS queries to avoid function call issues in joined queries.';

-- Re-create the management policies using direct EXISTS queries
CREATE POLICY "blocks_admin_writer_can_insert" ON public.blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER')));
COMMENT ON POLICY "blocks_admin_writer_can_insert" ON public.blocks IS 'Admins/Writers can insert blocks.';

CREATE POLICY "blocks_admin_writer_can_update" ON public.blocks
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER'))) -- Who can be targeted by an update
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER'))); -- What rows can be created/modified by them
COMMENT ON POLICY "blocks_admin_writer_can_update" ON public.blocks IS 'Admins/Writers can update blocks.';

CREATE POLICY "blocks_admin_writer_can_delete" ON public.blocks
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER')));
COMMENT ON POLICY "blocks_admin_writer_can_delete" ON public.blocks IS 'Admins/Writers can delete blocks.';

COMMIT;