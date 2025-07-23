-- supabase/migrations/YYYYMMDDHHMMSS_separate_write_policies_v8.sql

BEGIN;

-- == PROFILES ==
-- Assuming "authenticated_can_read_profiles" (FOR SELECT) is correctly in place.
-- Define explicit INSERT and leave UPDATE to the existing "authenticated_can_update_profiles" policy.
DROP POLICY IF EXISTS "admins_can_insert_profiles" ON public.profiles;
CREATE POLICY "admins_can_insert_profiles" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "admins_can_insert_profiles" ON public.profiles IS 'Admins can insert new profiles.';
-- "authenticated_can_update_profiles" (FOR UPDATE) is assumed to be in place and correct.


-- == BLOCKS ==
-- Drop the old "FOR ALL" or "FOR INSERT, UPDATE, DELETE" management policy
DROP POLICY IF EXISTS "blocks_admin_writer_management" ON public.blocks;

-- Create separate policies for INSERT, UPDATE, DELETE for Admins/Writers
CREATE POLICY "blocks_admin_writer_can_insert" ON public.blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "blocks_admin_writer_can_insert" ON public.blocks IS 'Admins/Writers can insert blocks.';

CREATE POLICY "blocks_admin_writer_can_update" ON public.blocks
  FOR UPDATE
  TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER')) -- USING is relevant for UPDATE
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "blocks_admin_writer_can_update" ON public.blocks IS 'Admins/Writers can update blocks.';

CREATE POLICY "blocks_admin_writer_can_delete" ON public.blocks
  FOR DELETE
  TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "blocks_admin_writer_can_delete" ON public.blocks IS 'Admins/Writers can delete blocks.';
-- Assumed SELECT policies: "blocks_anon_can_read_published" and "blocks_user_role_can_read_published_parents" are in place.


-- == LANGUAGES ==
DROP POLICY IF EXISTS "languages_admin_management" ON public.languages;

CREATE POLICY "languages_admin_can_insert" ON public.languages
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "languages_admin_can_insert" ON public.languages IS 'Admins can insert languages.';

CREATE POLICY "languages_admin_can_update" ON public.languages
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() = 'ADMIN')
  WITH CHECK (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "languages_admin_can_update" ON public.languages IS 'Admins can update languages.';

CREATE POLICY "languages_admin_can_delete" ON public.languages
  FOR DELETE TO authenticated
  USING (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "languages_admin_can_delete" ON public.languages IS 'Admins can delete languages.';
-- Assumed SELECT policies: "languages_anon_can_read" and "languages_authenticated_non_admin_can_read" are in place.


-- == MEDIA ==
DROP POLICY IF EXISTS "media_admin_writer_management" ON public.media;

CREATE POLICY "media_admin_writer_can_insert" ON public.media
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "media_admin_writer_can_insert" ON public.media IS 'Admins/Writers can insert media.';

CREATE POLICY "media_admin_writer_can_update" ON public.media
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "media_admin_writer_can_update" ON public.media IS 'Admins/Writers can update media.';

CREATE POLICY "media_admin_writer_can_delete" ON public.media
  FOR DELETE TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "media_admin_writer_can_delete" ON public.media IS 'Admins/Writers can delete media.';
-- Assumed SELECT policies: "media_anon_can_read" and "media_user_role_can_read" are in place.


-- == NAVIGATION ITEMS ==
DROP POLICY IF EXISTS "nav_items_admin_management" ON public.navigation_items;

CREATE POLICY "nav_items_admin_can_insert" ON public.navigation_items
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "nav_items_admin_can_insert" ON public.navigation_items IS 'Admins can insert navigation items.';

CREATE POLICY "nav_items_admin_can_update" ON public.navigation_items
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() = 'ADMIN')
  WITH CHECK (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "nav_items_admin_can_update" ON public.navigation_items IS 'Admins can update navigation items.';

CREATE POLICY "nav_items_admin_can_delete" ON public.navigation_items
  FOR DELETE TO authenticated
  USING (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "nav_items_admin_can_delete" ON public.navigation_items IS 'Admins can delete navigation items.';
-- Assumed SELECT policies: "nav_items_anon_can_read" and "nav_items_authenticated_non_admin_can_read" are in place.


-- == PAGES ==
DROP POLICY IF EXISTS "pages_admin_writer_management" ON public.pages;

CREATE POLICY "pages_admin_writer_can_insert" ON public.pages
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "pages_admin_writer_can_insert" ON public.pages IS 'Admins/Writers can insert pages.';

CREATE POLICY "pages_admin_writer_can_update" ON public.pages
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "pages_admin_writer_can_update" ON public.pages IS 'Admins/Writers can update pages.';

CREATE POLICY "pages_admin_writer_can_delete" ON public.pages
  FOR DELETE TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "pages_admin_writer_can_delete" ON public.pages IS 'Admins/Writers can delete pages.';
-- Assumed SELECT policies: "pages_anon_can_read_published" and "pages_user_role_can_read" are in place.


-- == POSTS ==
DROP POLICY IF EXISTS "posts_admin_writer_management" ON public.posts;

CREATE POLICY "posts_admin_writer_can_insert" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "posts_admin_writer_can_insert" ON public.posts IS 'Admins/Writers can insert posts.';

CREATE POLICY "posts_admin_writer_can_update" ON public.posts
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "posts_admin_writer_can_update" ON public.posts IS 'Admins/Writers can update posts.';

CREATE POLICY "posts_admin_writer_can_delete" ON public.posts
  FOR DELETE TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "posts_admin_writer_can_delete" ON public.posts IS 'Admins/Writers can delete posts.';
-- Assumed SELECT policies: "posts_anon_can_read_published" and "posts_user_role_can_read" are in place.

COMMIT;