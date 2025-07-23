-- supabase/migrations/YYYYMMDDHHMMSS_resolve_select_policy_overlaps.sql
-- (Ensure YYYYMMDDHHMMSS is the current timestamp)

BEGIN;

-- == BLOCKS ==
-- Assuming "blocks_admin_writer_management" is FOR ALL and covers SELECT for ADMIN/WRITER.
-- Make "blocks_authenticated_access" specific to non-ADMIN/WRITER authenticated users.
DROP POLICY IF EXISTS "blocks_authenticated_access" ON public.blocks;
CREATE POLICY "blocks_authenticated_user_access" ON public.blocks -- Renamed for clarity
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER')) AND -- This is the key change
    (
      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
    )
  );
COMMENT ON POLICY "blocks_authenticated_user_access" ON public.blocks IS 'Authenticated USERS (non-admin/writer) can read blocks of published parents. Admin/Writer SELECT via their management policy.';
-- Note: "blocks_anon_can_read_published" (FOR SELECT TO anon) should remain unchanged.
-- Note: "blocks_admin_writer_management" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) should remain unchanged.

-- == LANGUAGES ==
-- Assuming "languages_admin_management" is FOR ALL and covers SELECT for ADMIN.
-- Make "languages_are_publicly_readable_by_all" not apply to authenticated ADMINs.
DROP POLICY IF EXISTS "languages_are_publicly_readable_by_all" ON public.languages;
CREATE POLICY "languages_readable_by_anon_and_non_admins" ON public.languages -- Renamed
  FOR SELECT
  USING (
    NOT (auth.role() = 'authenticated' AND public.get_current_user_role() = 'ADMIN')
  );
COMMENT ON POLICY "languages_readable_by_anon_and_non_admins" ON public.languages IS 'Anonymous users and authenticated non-admins can read languages. Admin SELECT via management policy.';
-- Note: "languages_admin_management" (FOR ALL TO authenticated USING role = ADMIN) should remain unchanged.

-- == MEDIA ==
-- Assuming "media_admin_writer_management" is FOR ALL and covers SELECT for ADMIN/WRITER.
-- Make "media_is_publicly_readable_by_all" not apply to authenticated ADMIN/WRITERs.
DROP POLICY IF EXISTS "media_is_publicly_readable_by_all" ON public.media;
CREATE POLICY "media_readable_by_anon_and_non_privileged_users" ON public.media -- Renamed
  FOR SELECT
  USING (
    NOT (auth.role() = 'authenticated' AND public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  );
COMMENT ON POLICY "media_readable_by_anon_and_non_privileged_users" ON public.media IS 'Anonymous users and authenticated non-admin/writer users can read media. Admin/Writer SELECT via management policy.';
-- Note: "media_admin_writer_management" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) should remain unchanged.

-- == NAVIGATION ITEMS ==
-- Assuming "nav_items_admin_management" is FOR ALL and covers SELECT for ADMIN.
-- Make "nav_items_are_publicly_readable_by_all" not apply to authenticated ADMINs.
DROP POLICY IF EXISTS "nav_items_are_publicly_readable_by_all" ON public.navigation_items;
CREATE POLICY "nav_items_readable_by_anon_and_non_admins" ON public.navigation_items -- Renamed
  FOR SELECT
  USING (
    NOT (auth.role() = 'authenticated' AND public.get_current_user_role() = 'ADMIN')
  );
COMMENT ON POLICY "nav_items_readable_by_anon_and_non_admins" ON public.navigation_items IS 'Anonymous users and authenticated non-admins can read nav items. Admin SELECT via management policy.';
-- Note: "nav_items_admin_management" (FOR ALL TO authenticated USING role = ADMIN) should remain unchanged.

-- == PAGES ==
-- Assuming "pages_admin_writer_management" is FOR ALL and covers SELECT for ADMIN/WRITER.
-- Make "pages_authenticated_access" specific to non-ADMIN/WRITER authenticated users.
DROP POLICY IF EXISTS "pages_authenticated_access" ON public.pages;
CREATE POLICY "pages_user_authenticated_access" ON public.pages -- Renamed
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER')) AND -- This is the key change
    (
      (status = 'published') OR
      (author_id = (SELECT auth.uid()) AND status <> 'published')
    )
  );
COMMENT ON POLICY "pages_user_authenticated_access" ON public.pages IS 'Authenticated USERS (non-admin/writer) can read published pages or their own drafts. Admin/Writer SELECT via their management policy.';
-- Note: "pages_anon_can_read_published" (FOR SELECT TO anon) should remain unchanged.
-- Note: "pages_admin_writer_management" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) should remain unchanged.

-- == POSTS ==
-- Assuming "posts_admin_writer_management" is FOR ALL and covers SELECT for ADMIN/WRITER.
-- Make "posts_authenticated_access" specific to non-ADMIN/WRITER authenticated users.
DROP POLICY IF EXISTS "posts_authenticated_access" ON public.posts;
CREATE POLICY "posts_user_authenticated_access" ON public.posts -- Renamed
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER')) AND -- This is the key change
    (
      (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR
      (author_id = (SELECT auth.uid()) AND status <> 'published')
    )
  );
COMMENT ON POLICY "posts_user_authenticated_access" ON public.posts IS 'Authenticated USERS (non-admin/writer) can read published posts or their own drafts. Admin/Writer SELECT via their management policy.';
-- Note: "posts_anon_can_read_published" (FOR SELECT TO anon) should remain unchanged.
-- Note: "posts_admin_writer_management" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) should remain unchanged.

COMMIT;