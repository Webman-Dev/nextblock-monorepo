-- supabase/migrations/YYYYMMDDHHMMSS_final_rls_cleanup_v7.sql
-- (Ensure YYMMDDHHMMSS is the current timestamp)

BEGIN;

-- == BLOCKS ==
-- Conflicting: {blocks_admin_writer_management, blocks_user_role_can_read_published_parents}
-- "blocks_admin_writer_management" is FOR ALL and covers SELECT for ADMIN/WRITER.
-- "blocks_user_role_can_read_published_parents" is for 'USER' role.
-- This structure *should* be fine. The linter might be overly cautious.
-- To be absolutely sure, we ensure "blocks_user_role_can_read_published_parents" only targets 'USER'.
DROP POLICY IF EXISTS "blocks_user_role_can_read_published_parents" ON public.blocks;
CREATE POLICY "blocks_user_role_can_read_published_parents" ON public.blocks
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() = 'USER') AND
    (
      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
    )
  );
COMMENT ON POLICY "blocks_user_role_can_read_published_parents" ON public.blocks IS 'Authenticated USERS can read blocks of published parents. Admin/Writer SELECT via their FOR ALL management policy.';
-- Assuming "blocks_anon_can_read_published" and "blocks_admin_writer_management" (FOR ALL) are correct from previous migrations.


-- == LANGUAGES ==
-- Conflicting: {languages_admin_management, languages_user_can_read}
-- "languages_admin_management" is FOR ALL and covers SELECT for ADMIN.
-- "languages_user_can_read" (from v5) was: TO authenticated USING (public.get_current_user_role() <> 'ADMIN');
-- This should be fine, as an ADMIN would make the USING clause false.
-- To be very explicit for the linter:
DROP POLICY IF EXISTS "languages_user_can_read" ON public.languages;
CREATE POLICY "languages_authenticated_non_admin_can_read" ON public.languages
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() IN ('USER', 'WRITER') -- Explicitly target USER and WRITER
  );
COMMENT ON POLICY "languages_authenticated_non_admin_can_read" ON public.languages IS 'Authenticated USER and WRITER roles can read languages. Admin SELECT via their FOR ALL management policy.';
-- Assuming "languages_anon_can_read" and "languages_admin_management" (FOR ALL) are correct.


-- == MEDIA ==
-- Conflicting: {media_admin_writer_management, media_user_can_read}
-- "media_admin_writer_management" is FOR ALL and covers SELECT for ADMIN/WRITER.
-- "media_user_can_read" (from v5) was: TO authenticated USING (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER'));
-- This should be fine. To be very explicit:
DROP POLICY IF EXISTS "media_user_can_read" ON public.media;
CREATE POLICY "media_user_role_can_read" ON public.media
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'USER' -- Explicitly target USER role
  );
COMMENT ON POLICY "media_user_role_can_read" ON public.media IS 'Authenticated USER role can read media. Admin/Writer SELECT via their FOR ALL management policy.';
-- Assuming "media_anon_can_read" and "media_admin_writer_management" (FOR ALL) are correct.


-- == NAVIGATION ITEMS ==
-- Conflicting: {nav_items_admin_management, nav_items_user_can_read}
-- "nav_items_admin_management" is FOR ALL and covers SELECT for ADMIN.
-- "nav_items_user_can_read" (from v5) was: TO authenticated USING (public.get_current_user_role() <> 'ADMIN');
DROP POLICY IF EXISTS "nav_items_user_can_read" ON public.navigation_items;
CREATE POLICY "nav_items_authenticated_non_admin_can_read" ON public.navigation_items
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() IN ('USER', 'WRITER') -- Explicitly target USER and WRITER
  );
COMMENT ON POLICY "nav_items_authenticated_non_admin_can_read" ON public.navigation_items IS 'Authenticated USER and WRITER roles can read nav items. Admin SELECT via their FOR ALL management policy.';
-- Assuming "nav_items_anon_can_read" and "nav_items_admin_management" (FOR ALL) are correct.


-- == PAGES ==
-- Conflicting: {pages_admin_writer_management, pages_user_role_access}
-- This structure is identical to blocks and should be fine if "pages_user_role_access" correctly targets only USER.
DROP POLICY IF EXISTS "pages_user_role_access" ON public.pages;
CREATE POLICY "pages_user_role_can_read" ON public.pages -- Consistent naming
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() = 'USER') AND
    (
      (status = 'published') OR
      (author_id = (SELECT auth.uid()) AND status <> 'published')
    )
  );
COMMENT ON POLICY "pages_user_role_can_read" ON public.pages IS 'Authenticated USERS can read published pages or their own drafts. Admin/Writer SELECT via their FOR ALL management policy.';
-- Assuming "pages_anon_can_read_published" and "pages_admin_writer_management" (FOR ALL) are correct.


-- == POSTS ==
-- Conflicting: {posts_admin_writer_management, posts_user_role_access}
-- This structure is identical to blocks/pages and should be fine if "posts_user_role_access" correctly targets only USER.
DROP POLICY IF EXISTS "posts_user_role_access" ON public.posts;
CREATE POLICY "posts_user_role_can_read" ON public.posts -- Consistent naming
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() = 'USER') AND
    (
      (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR
      (author_id = (SELECT auth.uid()) AND status <> 'published')
    )
  );
COMMENT ON POLICY "posts_user_role_can_read" ON public.posts IS 'Authenticated USERS can read published posts or their own drafts. Admin/Writer SELECT via their FOR ALL management policy.';
-- Assuming "posts_anon_can_read_published" and "posts_admin_writer_management" (FOR ALL) are correct.

COMMIT;