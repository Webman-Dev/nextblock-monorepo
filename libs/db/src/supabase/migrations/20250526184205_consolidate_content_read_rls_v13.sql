-- supabase/migrations/YYYYMMDDHHMMSS_consolidate_content_read_rls_v13.sql

BEGIN;

-- == POSTS ==

-- Drop the existing separate SELECT policies for authenticated users on posts
DROP POLICY IF EXISTS "posts_authenticated_can_read_published" ON public.posts;
DROP POLICY IF EXISTS "posts_authors_can_read_own_drafts" ON public.posts;
-- Drop any older variations that might exist
DROP POLICY IF EXISTS "posts_user_role_can_read" ON public.posts;
DROP POLICY IF EXISTS "posts_user_authenticated_access" ON public.posts;
DROP POLICY IF EXISTS "posts_authenticated_access" ON public.posts;


-- Create a single, comprehensive SELECT policy for authenticated users on posts
CREATE POLICY "posts_authenticated_comprehensive_read" ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    -- Condition 1: Any authenticated user can read PUBLISHED posts
    (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR
    -- Condition 2: Authenticated authors can read their OWN NON-PUBLISHED posts
    (author_id = (SELECT auth.uid()) AND status <> 'published') OR
    -- Condition 3: ADMINs and WRITERs can read ALL posts (any status)
    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  );
COMMENT ON POLICY "posts_authenticated_comprehensive_read" ON public.posts IS 'Handles all SELECT scenarios for authenticated users: published for all, own drafts for authors, and all posts for admins/writers.';

-- "posts_anon_can_read_published" (FOR SELECT TO anon) is assumed to be correct and in place.
-- Admin/Writer management policies (FOR INSERT, UPDATE, DELETE) are assumed to be correct and in place.


-- == PAGES ==

-- Drop the existing separate SELECT policies for authenticated users on pages
DROP POLICY IF EXISTS "pages_authenticated_can_read_published" ON public.pages; -- If created in a previous step
DROP POLICY IF EXISTS "pages_authors_can_read_own_drafts" ON public.pages; -- If created
DROP POLICY IF EXISTS "pages_user_role_can_read" ON public.pages;
DROP POLICY IF EXISTS "pages_user_authenticated_access" ON public.pages;
DROP POLICY IF EXISTS "pages_authenticated_access" ON public.pages;


-- Create a single, comprehensive SELECT policy for authenticated users on pages
CREATE POLICY "pages_authenticated_comprehensive_read" ON public.pages
  FOR SELECT
  TO authenticated
  USING (
    -- Condition 1: Any authenticated user can read PUBLISHED pages
    (status = 'published') OR
    -- Condition 2: Authenticated authors can read their OWN NON-PUBLISHED pages
    (author_id = (SELECT auth.uid()) AND status <> 'published') OR
    -- Condition 3: ADMINs and WRITERs can read ALL pages (any status)
    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  );
COMMENT ON POLICY "pages_authenticated_comprehensive_read" ON public.pages IS 'Handles all SELECT scenarios for authenticated users: published for all, own drafts for authors, and all pages for admins/writers.';

-- "pages_anon_can_read_published" (FOR SELECT TO anon) is assumed to be correct and in place.
-- Admin/Writer management policies (FOR INSERT, UPDATE, DELETE) are assumed to be correct and in place.

COMMIT;