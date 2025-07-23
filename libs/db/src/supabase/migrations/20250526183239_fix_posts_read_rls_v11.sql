-- supabase/migrations/YYYYMMDDHHMMSS_fix_posts_read_rls_v11.sql

BEGIN;

-- == POSTS ==

-- Drop the existing specific SELECT policy for USER role if it exists
DROP POLICY IF EXISTS "posts_user_role_can_read" ON public.posts;
-- Drop any older variations that might exist from previous attempts
DROP POLICY IF EXISTS "posts_user_authenticated_access" ON public.posts;
DROP POLICY IF EXISTS "posts_authenticated_access" ON public.posts;


-- Policy for anonymous users to read published posts (should already exist, ensure it's correct)
DROP POLICY IF EXISTS "posts_anon_can_read_published" ON public.posts;
CREATE POLICY "posts_anon_can_read_published" ON public.posts
  FOR SELECT
  TO anon
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
COMMENT ON POLICY "posts_anon_can_read_published" ON public.posts IS 'Anonymous users can read published posts.';


-- Policy for ALL authenticated users to read PUBLISHED posts.
-- This covers USER, WRITER, and ADMIN for viewing public, published content.
CREATE POLICY "posts_authenticated_can_read_published" ON public.posts
  FOR SELECT
  TO authenticated
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
COMMENT ON POLICY "posts_authenticated_can_read_published" ON public.posts IS 'All authenticated users can read published posts.';


-- Policy for authenticated users (authors) to read their OWN DRAFTS/non-published posts.
-- This is important for CMS previews or if authors can view their non-live content.
DROP POLICY IF EXISTS "posts_authors_can_read_own_drafts" ON public.posts;
CREATE POLICY "posts_authors_can_read_own_drafts" ON public.posts
  FOR SELECT
  TO authenticated
  USING (author_id = (SELECT auth.uid()) AND status <> 'published');
COMMENT ON POLICY "posts_authors_can_read_own_drafts" ON public.posts IS 'Authenticated authors can read their own non-published posts.';


-- The admin/writer management policies for INSERT, UPDATE, DELETE remain as they are (write-only).
-- e.g., "posts_admin_writer_can_insert", "posts_admin_writer_can_update", "posts_admin_writer_can_delete"
-- These do NOT provide SELECT access.

-- Optional: If you need ADMINs/WRITERs to be able to SELECT *ALL* posts (including drafts of others)
-- for CMS management purposes (e.g., in the /cms/posts listing page), you would need an
-- additional policy or ensure their management policy was FOR ALL.
-- However, for public site rendering (getPostDataBySlug), the above should be sufficient.
-- If your CMS listing page for posts also breaks for ADMIN/WRITER, you might need:
-- CREATE POLICY "posts_admin_writer_can_read_all_for_cms" ON public.posts
--   FOR SELECT
--   TO authenticated
--   USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));
-- This WILL re-introduce a "multiple_permissive_policies" warning for ADMIN/WRITER on SELECT,
-- as they would match this AND "posts_authenticated_can_read_published".
-- For now, let's stick to fixing public reads. The CMS read access might be handled differently or might need its own policy.

COMMIT;