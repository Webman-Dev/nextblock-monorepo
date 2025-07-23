-- supabase/migrations/YYYYMMDDHHMMSS_debug_blocks_rls.sql

BEGIN;

-- Drop the more specific separated write policies for blocks from v8
DROP POLICY IF EXISTS "blocks_admin_writer_can_insert" ON public.blocks;
DROP POLICY IF EXISTS "blocks_admin_writer_can_update" ON public.blocks;
DROP POLICY IF EXISTS "blocks_admin_writer_can_delete" ON public.blocks;

-- Reinstate a broad "FOR ALL" policy for ADMINS and WRITERS on blocks
-- This is similar to what was effectively in place before v8 for admin/writer management.
CREATE POLICY "blocks_admin_writer_management_reinstated" ON public.blocks
  FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));

COMMENT ON POLICY "blocks_admin_writer_management_reinstated" ON public.blocks IS 'Reinstated FOR ALL policy for ADMIN/WRITER to manage blocks. This may cause linter warnings for SELECT overlaps if other SELECT policies exist but is for debugging block creation.';

-- Ensure SELECT policies for other roles are still in place and don't conflict in a breaking way.
-- The policies "blocks_anon_can_read_published" and "blocks_user_role_can_read_published_parents" (from v5/v7) handle reads for anon and USERs.
-- "blocks_anon_can_read_published" (FOR SELECT TO anon USING (...))
-- "blocks_user_role_can_read_published_parents" (FOR SELECT TO authenticated USING (public.get_current_user_role() = 'USER' AND ...))

-- Let's re-assert the anon read policy to be sure it's correct, as it was defined early on.
DROP POLICY IF EXISTS "blocks_are_readable_if_parent_is_published" ON public.blocks; -- Original name from 20250514171553
DROP POLICY IF EXISTS "blocks_anon_can_read_published" ON public.blocks; -- Renamed in 20250526153321

CREATE POLICY "blocks_anon_can_read_published_content" ON public.blocks
  FOR SELECT
  TO anon
  USING (
    (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
    (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
  );
COMMENT ON POLICY "blocks_anon_can_read_published_content" ON public.blocks IS 'Anonymous users can read blocks of published parent pages/posts.';


-- Re-assert the USER role SELECT policy, ensuring it only applies to USER.
DROP POLICY IF EXISTS "blocks_authenticated_user_access" ON public.blocks; -- From v4
DROP POLICY IF EXISTS "blocks_user_role_can_read_published_parents" ON public.blocks; -- From v5/v7

CREATE POLICY "blocks_auth_users_can_read_published_parents" ON public.blocks
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() = 'USER') AND -- Crucially, only applies to 'USER' role
    (
      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
    )
  );
COMMENT ON POLICY "blocks_auth_users_can_read_published_parents" ON public.blocks IS 'Authenticated USERS can read blocks of published parents. Admin/Writer SELECT is handled by their management policy.';


COMMIT;