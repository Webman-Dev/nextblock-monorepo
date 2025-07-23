-- supabase/migrations/YYYYMMDDHHMMSS_consolidate_blocks_select_rls.sql
-- (Replace YYYYMMDDHHMMSS with the actual timestamp of this migration file)

BEGIN;

-- Drop existing policies for 'public.blocks' that will be replaced or refined.
-- This includes the broad "FOR ALL" policy and the specific "USER" SELECT policy
-- created in the previous debug migration.
DROP POLICY IF EXISTS "blocks_admin_writer_management_reinstated" ON public.blocks;
DROP POLICY IF EXISTS "blocks_auth_users_can_read_published_parents" ON public.blocks;

-- The "blocks_anon_can_read_published_content" policy can remain as it targets 'anon'
-- and does not conflict with 'authenticated' role policies for the linter's warning.
-- However, if you wish to have a completely clean slate before adding the consolidated one,
-- you can drop and re-add it. For this exercise, we'll assume it's fine and already specific.
-- If it was named "blocks_anon_can_read_published" from 20250526153321_optimize_rls_policies.sql:
-- DROP POLICY IF EXISTS "blocks_anon_can_read_published" ON public.blocks;
-- Or if it was "blocks_are_readable_if_parent_is_published" from 20250514171553_create_blocks_table.sql:
-- DROP POLICY IF EXISTS "blocks_are_readable_if_parent_is_published" ON public.blocks;
-- Re-creating the anon policy for clarity and to ensure it's exactly as needed:
DROP POLICY IF EXISTS "blocks_anon_can_read_published_content" ON public.blocks; -- From debug migration
DROP POLICY IF EXISTS "blocks_anon_can_read_published" ON public.blocks; -- From optimize_rls_policies
DROP POLICY IF EXISTS "blocks_are_readable_if_parent_is_published" ON public.blocks; -- From initial table creation

CREATE POLICY "blocks_anon_can_read_published_blocks" ON public.blocks
  FOR SELECT
  TO anon
  USING (
    (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
    (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
  );
COMMENT ON POLICY "blocks_anon_can_read_published_blocks" ON public.blocks IS 'Anonymous users can read blocks of published parent content.';


-- Create a single, comprehensive SELECT policy for ALL authenticated users on blocks
CREATE POLICY "blocks_authenticated_comprehensive_select" ON public.blocks
  FOR SELECT
  TO authenticated
  USING (
    (
      -- Condition for ADMIN or WRITER: they can read ALL blocks
      (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    ) OR
    (
      -- Condition for USER: they can read blocks of published parents
      ((SELECT public.get_current_user_role()) = 'USER') AND
      (
        (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
        (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
      )
    )
  );
COMMENT ON POLICY "blocks_authenticated_comprehensive_select" ON public.blocks IS 'Comprehensive SELECT policy for authenticated users on the blocks table, differentiating access by role (ADMIN/WRITER see all, USER sees blocks of published parents).';


-- Re-add the specific management policies for INSERT, UPDATE, DELETE for ADMIN/WRITER.
-- These only have WITH CHECK (for INSERT/UPDATE) or USING (for DELETE/UPDATE) based on role.
-- These were the ones created in 20250526174710_separate_write_policies_v8.sql and are fine.

CREATE POLICY "blocks_admin_writer_can_insert" ON public.blocks
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "blocks_admin_writer_can_insert" ON public.blocks IS 'Admins/Writers can insert blocks.';

CREATE POLICY "blocks_admin_writer_can_update" ON public.blocks
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')) -- Who can be targeted by an update
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')); -- What rows can be created/modified by them
COMMENT ON POLICY "blocks_admin_writer_can_update" ON public.blocks IS 'Admins/Writers can update blocks.';

CREATE POLICY "blocks_admin_writer_can_delete" ON public.blocks
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "blocks_admin_writer_can_delete" ON public.blocks IS 'Admins/Writers can delete blocks.';

COMMIT;