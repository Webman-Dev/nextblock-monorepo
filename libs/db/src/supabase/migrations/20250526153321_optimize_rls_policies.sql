-- supabase/migrations/YYYYMMDDHHMMSS_optimize_rls_policies_v2.sql
-- Replace YYYYMMDDHHMMSS with the actual timestamp of this migration file.

BEGIN;

-- == PROFILES ==
DROP POLICY IF EXISTS "users_can_select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_select_any_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_any_profile" ON public.profiles;

CREATE POLICY "authenticated_can_read_profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (id = (SELECT auth.uid())) OR
    (public.get_current_user_role() = 'ADMIN')
  );
COMMENT ON POLICY "authenticated_can_read_profiles" ON public.profiles IS 'Authenticated users can read their own profile, and admins can read any profile.';

CREATE POLICY "authenticated_can_update_profiles" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (id = (SELECT auth.uid())) OR
    (public.get_current_user_role() = 'ADMIN')
  )
  WITH CHECK (
    (id = (SELECT auth.uid())) OR
    (public.get_current_user_role() = 'ADMIN')
  );
COMMENT ON POLICY "authenticated_can_update_profiles" ON public.profiles IS 'Authenticated users can update their own profile, and admins can update any profile.';

-- Ensure admin insert policy is present and correct (it typically uses WITH CHECK on the role, not USING for insert)
DROP POLICY IF EXISTS "admins_can_insert_profiles" ON public.profiles;
CREATE POLICY "admins_can_insert_profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "admins_can_insert_profiles" ON public.profiles IS 'Admin users can insert new profiles.';


-- == PAGES ==
DROP POLICY IF EXISTS "pages_are_publicly_readable_when_published" ON public.pages;
DROP POLICY IF EXISTS "authors_writers_admins_can_read_own_drafts" ON public.pages;
DROP POLICY IF EXISTS "authors_writers_admins_can_read_own_or_all_drafts" ON public.pages;
DROP POLICY IF EXISTS "admins_and_writers_can_manage_pages" ON public.pages;

CREATE POLICY "pages_anon_can_read_published" ON public.pages
  FOR SELECT
  TO anon
  USING (status = 'published');
COMMENT ON POLICY "pages_anon_can_read_published" ON public.pages IS 'Anonymous users can read published pages.';

CREATE POLICY "pages_authenticated_access" ON public.pages
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published') OR
    (author_id = (SELECT auth.uid()) AND status <> 'published') OR
    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  );
COMMENT ON POLICY "pages_authenticated_access" ON public.pages IS 'Authenticated users can read published pages, their own drafts, or all pages if admin/writer.';

CREATE POLICY "pages_admin_writer_management" ON public.pages
  FOR ALL -- Changed from INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "pages_admin_writer_management" ON public.pages IS 'Admins and Writers can manage pages.';


-- == POSTS ==
DROP POLICY IF EXISTS "posts_are_publicly_readable_when_published" ON public.posts;
DROP POLICY IF EXISTS "authors_writers_admins_can_read_own_draft_posts" ON public.posts;
DROP POLICY IF EXISTS "authors_writers_admins_can_read_own_or_all_draft_posts" ON public.posts;
DROP POLICY IF EXISTS "admins_and_writers_can_manage_posts" ON public.posts;

CREATE POLICY "posts_anon_can_read_published" ON public.posts
  FOR SELECT
  TO anon
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
COMMENT ON POLICY "posts_anon_can_read_published" ON public.posts IS 'Anonymous users can read published posts.';

CREATE POLICY "posts_authenticated_access" ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR
    (author_id = (SELECT auth.uid()) AND status <> 'published') OR
    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  );
COMMENT ON POLICY "posts_authenticated_access" ON public.posts IS 'Authenticated users can read published posts, their own drafts, or all posts if admin/writer.';

CREATE POLICY "posts_admin_writer_management" ON public.posts
  FOR ALL -- Changed from INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "posts_admin_writer_management" ON public.posts IS 'Admins and Writers can manage posts.';


-- == BLOCKS ==
DROP POLICY IF EXISTS "blocks_are_readable_if_parent_is_published" ON public.blocks;
DROP POLICY IF EXISTS "admins_and_writers_can_manage_blocks" ON public.blocks;

CREATE POLICY "blocks_anon_can_read_published" ON public.blocks
  FOR SELECT
  TO anon
  USING (
    (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
    (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
  );
COMMENT ON POLICY "blocks_anon_can_read_published" ON public.blocks IS 'Anonymous users can read blocks of published parent pages/posts.';

CREATE POLICY "blocks_authenticated_access" ON public.blocks
  FOR SELECT
  TO authenticated
  USING (
    (public.get_current_user_role() IN ('ADMIN', 'WRITER')) OR
    (
      (public.get_current_user_role() = 'USER') AND (
        (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
        (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
      )
    )
  );
COMMENT ON POLICY "blocks_authenticated_access" ON public.blocks IS 'Admins/Writers can read all blocks; Users can read blocks of published parents.';

CREATE POLICY "blocks_admin_writer_management" ON public.blocks
  FOR ALL -- Changed from INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "blocks_admin_writer_management" ON public.blocks IS 'Admins and Writers can manage blocks.';


-- == LANGUAGES ==
DROP POLICY IF EXISTS "languages_are_publicly_readable" ON public.languages;
DROP POLICY IF EXISTS "admins_can_manage_languages" ON public.languages;

CREATE POLICY "languages_are_publicly_readable_by_all" ON public.languages
  FOR SELECT
  USING (true);
COMMENT ON POLICY "languages_are_publicly_readable_by_all" ON public.languages IS 'All users (anon and authenticated) can read languages.';

CREATE POLICY "languages_admin_management" ON public.languages
  FOR ALL -- Changed from INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.get_current_user_role() = 'ADMIN')
  WITH CHECK (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "languages_admin_management" ON public.languages IS 'Admins can manage languages.';


-- == MEDIA ==
DROP POLICY IF EXISTS "media_is_readable_by_all" ON public.media;
DROP POLICY IF EXISTS "media_are_publicly_readable" ON public.media;
DROP POLICY IF EXISTS "admins_and_writers_can_manage_media" ON public.media;

CREATE POLICY "media_is_publicly_readable_by_all" ON public.media
  FOR SELECT
  USING (true);
COMMENT ON POLICY "media_is_publicly_readable_by_all" ON public.media IS 'All users (anon and authenticated) can read media records.';

CREATE POLICY "media_admin_writer_management" ON public.media
  FOR ALL -- Changed from INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
COMMENT ON POLICY "media_admin_writer_management" ON public.media IS 'Admins and Writers can manage media records.';


-- == NAVIGATION ITEMS ==
DROP POLICY IF EXISTS "navigation_is_publicly_readable" ON public.navigation_items;
DROP POLICY IF EXISTS "admins_can_manage_navigation" ON public.navigation_items;

CREATE POLICY "nav_items_are_publicly_readable_by_all" ON public.navigation_items
  FOR SELECT
  USING (true);
COMMENT ON POLICY "nav_items_are_publicly_readable_by_all" ON public.navigation_items IS 'All users (anon and authenticated) can read navigation items.';

CREATE POLICY "nav_items_admin_management" ON public.navigation_items
  FOR ALL -- Changed from INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.get_current_user_role() = 'ADMIN')
  WITH CHECK (public.get_current_user_role() = 'ADMIN');
COMMENT ON POLICY "nav_items_admin_management" ON public.navigation_items IS 'Admins can manage navigation items.';

COMMIT;