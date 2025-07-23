-- supabase/migrations/YYYYMMDDHHMMSS_resolve_remaining_rls_v5.sql
-- (Ensure YYYYMMDDHHMMSS is the current timestamp)

BEGIN;

-- == LANGUAGES ==
-- Drop the policy from v4 that needs auth.role() fix and better role targeting.
DROP POLICY IF EXISTS "languages_readable_by_anon_and_non_admins" ON public.languages;
-- Policy for anon
CREATE POLICY "languages_anon_can_read" ON public.languages
  FOR SELECT TO anon USING (true);
COMMENT ON POLICY "languages_anon_can_read" ON public.languages IS 'Anonymous users can read languages.';
-- Policy for authenticated USERS (non-admins)
CREATE POLICY "languages_user_can_read" ON public.languages
  FOR SELECT TO authenticated
  USING (public.get_current_user_role() <> 'ADMIN'); -- Allows USER and WRITER (if writer isn't admin)
COMMENT ON POLICY "languages_user_can_read" ON public.languages IS 'Authenticated non-admin users can read languages.';
-- "languages_admin_management" (FOR ALL TO authenticated USING role = ADMIN) is assumed to be current and handles admin SELECT.


-- == MEDIA ==
-- Drop the policy from v4
DROP POLICY IF EXISTS "media_readable_by_anon_and_non_privileged_users" ON public.media;
-- Policy for anon
CREATE POLICY "media_anon_can_read" ON public.media
  FOR SELECT TO anon USING (true);
COMMENT ON POLICY "media_anon_can_read" ON public.media IS 'Anonymous users can read media records.';
-- Policy for authenticated USERS (non-admin/writer)
CREATE POLICY "media_user_can_read" ON public.media
  FOR SELECT TO authenticated
  USING (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "media_user_can_read" ON public.media IS 'Authenticated USERS (non-admin/writer) can read media records.';
-- "media_admin_writer_management" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) is assumed current.


-- == NAVIGATION ITEMS ==
-- Drop the policy from v4
DROP POLICY IF EXISTS "nav_items_readable_by_anon_and_non_admins" ON public.navigation_items;
-- Policy for anon
CREATE POLICY "nav_items_anon_can_read" ON public.navigation_items
  FOR SELECT TO anon USING (true);
COMMENT ON POLICY "nav_items_anon_can_read" ON public.navigation_items IS 'Anonymous users can read navigation items.';
-- Policy for authenticated USERS (non-admins)
CREATE POLICY "nav_items_user_can_read" ON public.navigation_items
  FOR SELECT TO authenticated
  USING (public.get_current_user_role() <> 'ADMIN'); -- Allows USER and WRITER
COMMENT ON POLICY "nav_items_user_can_read" ON public.navigation_items IS 'Authenticated non-admin users can read navigation items.';
-- "nav_items_admin_management" (FOR ALL TO authenticated USING role = ADMIN) is assumed current.


-- == BLOCKS ==
-- Drop the "blocks_authenticated_user_access" from v4
DROP POLICY IF EXISTS "blocks_authenticated_user_access" ON public.blocks;
-- Recreate explicitly for USER role to avoid overlap with admin/writer FOR ALL policy
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
COMMENT ON POLICY "blocks_user_role_can_read_published_parents" ON public.blocks IS 'Authenticated USERS can read blocks of published parents. Admin/Writer SELECT via their management policy.';
-- "blocks_anon_can_read_published" (FOR SELECT TO anon) from previous migrations is assumed to be fine.
-- "blocks_admin_writer_management" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) is assumed current.


-- == PAGES ==
-- Drop "pages_user_authenticated_access" from v4
DROP POLICY IF EXISTS "pages_user_authenticated_access" ON public.pages;
-- Recreate explicitly for USER role
CREATE POLICY "pages_user_role_access" ON public.pages
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() = 'USER') AND
    (
      (status = 'published') OR
      (author_id = (SELECT auth.uid()) AND status <> 'published') -- auth.uid() is fine here as it's specific to USER
    )
  );
COMMENT ON POLICY "pages_user_role_access" ON public.pages IS 'Authenticated USERS can read published pages or their own drafts. Admin/Writer SELECT via their management policy.';
-- "pages_anon_can_read_published" (FOR SELECT TO anon) is assumed fine.
-- "pages_admin_writer_management" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) is assumed current.

-- == POSTS ==
-- Drop "posts_user_authenticated_access" from v4
DROP POLICY IF EXISTS "posts_user_authenticated_access" ON public.posts;
-- Recreate explicitly for USER role
CREATE POLICY "posts_user_role_access" ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() = 'USER') AND
    (
      (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR
      (author_id = (SELECT auth.uid()) AND status <> 'published') -- auth.uid() is fine here
    )
  );
COMMENT ON POLICY "posts_user_role_access" ON public.posts IS 'Authenticated USERS can read published posts or their own drafts. Admin/Writer SELECT via their management policy.';
-- "posts_anon_can_read_published" (FOR SELECT TO anon) is assumed fine.
-- "posts_admin_writer_management" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) is assumed current.


COMMIT;