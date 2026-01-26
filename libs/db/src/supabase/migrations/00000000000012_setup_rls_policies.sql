-- 00000000000020_setup_rls_policies.sql
-- Consolidated RLS Policies

BEGIN;

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;

-- 2. GRANT PERMISSIONS (Crucial step often missed)
-- Grant usage on schema (redundant if in setup_extensions, but safe)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant SELECT to anon (public) for content that should be visible
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.languages TO anon;
GRANT SELECT ON TABLE public.media TO anon;
GRANT SELECT ON TABLE public.posts TO anon;
GRANT SELECT ON TABLE public.pages TO anon;
GRANT SELECT ON TABLE public.blocks TO anon;
GRANT SELECT ON TABLE public.navigation_items TO anon;
GRANT SELECT ON TABLE public.logos TO anon;
GRANT SELECT ON TABLE public.site_settings TO anon;
GRANT SELECT ON TABLE public.translations TO anon;

-- Grant ALL to authenticated (RLS will still restrict rows)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant ALL to service_role (Admin access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- 3. PROFILES
-- Read: Public can read basic profile info (needed for author display).
CREATE POLICY "profiles_read_policy" ON public.profiles
  FOR SELECT TO public
  USING (true);

-- Create explicit policy for service_role to bypass RLS on profiles
CREATE POLICY "profiles_service_role_policy" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Update: Users can update own profile; Admins can update all.
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (id = auth.uid()) OR
    (public.get_current_user_role() = 'ADMIN')
  )
  WITH CHECK (
    (id = auth.uid()) OR
    (public.get_current_user_role() = 'ADMIN')
  );

-- Insert: Admins can insert (Trigger handles signups).
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() = 'ADMIN');


-- 4. PAGES
-- Read: Anon/Auth can read published. Authors/Admins/Writers can read drafts.
CREATE POLICY "pages_read_policy" ON public.pages
  FOR SELECT TO authenticated
  USING (
    (status = 'published') OR
    (author_id = auth.uid() AND status <> 'published') OR
    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  );

CREATE POLICY "pages_anon_read_policy" ON public.pages
  FOR SELECT TO anon
  USING (status = 'published');

-- Manage: Admins/Writers can do everything.
CREATE POLICY "pages_manage_policy" ON public.pages
  FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));


-- 5. POSTS
-- Read: Anon/Auth can read published. Authors/Admins/Writers can read drafts.
CREATE POLICY "posts_read_policy" ON public.posts
  FOR SELECT TO authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR
    (author_id = auth.uid() AND status <> 'published') OR
    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  );

CREATE POLICY "posts_anon_read_policy" ON public.posts
  FOR SELECT TO anon
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

-- Manage: Admins/Writers can do everything.
CREATE POLICY "posts_manage_policy" ON public.posts
  FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));


-- 6. BLOCKS
-- Read: Admins/Writers see all. Others see blocks of published parents.
CREATE POLICY "blocks_read_policy" ON public.blocks
  FOR SELECT TO authenticated
  USING (
    (public.get_current_user_role() IN ('ADMIN', 'WRITER')) OR
    (
      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
    )
  );

CREATE POLICY "blocks_anon_read_policy" ON public.blocks
  FOR SELECT TO anon
  USING (
    (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
    (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
  );

-- Manage: Admins/Writers can do everything.
CREATE POLICY "blocks_manage_policy" ON public.blocks
  FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));


-- 7. MEDIA
-- Read: Publicly readable.
CREATE POLICY "media_read_policy" ON public.media
  FOR SELECT TO public
  USING (true);

-- Manage: Admins/Writers can do everything.
CREATE POLICY "media_manage_policy" ON public.media
  FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));

-- Service Role: Full access (for uploads).
CREATE POLICY "media_service_role_policy" ON public.media
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- 8. NAVIGATION
-- Read: Publicly readable.
CREATE POLICY "navigation_read_policy" ON public.navigation_items
  FOR SELECT TO public
  USING (true);

-- Manage: Admins only.
CREATE POLICY "navigation_manage_policy" ON public.navigation_items
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'ADMIN')
  WITH CHECK (public.get_current_user_role() = 'ADMIN');


-- 9. LANGUAGES
-- Read: Publicly readable.
CREATE POLICY "languages_read_policy" ON public.languages
  FOR SELECT TO public
  USING (true);

-- Manage: Admins only.
CREATE POLICY "languages_manage_policy" ON public.languages
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'ADMIN')
  WITH CHECK (public.get_current_user_role() = 'ADMIN');


-- 10. LOGOS
-- Read: Publicly readable.
CREATE POLICY "logos_read_policy" ON public.logos
  FOR SELECT TO public
  USING (true);

-- Manage: Admins only.
CREATE POLICY "logos_manage_policy" ON public.logos
  FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'ADMIN')
  WITH CHECK (public.get_current_user_role() = 'ADMIN');


-- 11. SITE SETTINGS
-- Read: Publicly readable.
CREATE POLICY "site_settings_read_policy" ON public.site_settings
  FOR SELECT TO public
  USING (true);

-- Manage: Admins/Writers.
CREATE POLICY "site_settings_manage_policy" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));


-- 12. TRANSLATIONS
-- Read: Publicly readable.
CREATE POLICY "translations_read_policy" ON public.translations
  FOR SELECT TO public
  USING (true);

-- Manage: Authenticated users (Open for now based on latest fix).
CREATE POLICY "translations_manage_policy" ON public.translations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
  

-- 13. REVISIONS
-- Read: Authenticated users.
CREATE POLICY "page_revisions_read_policy" ON public.page_revisions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "post_revisions_read_policy" ON public.post_revisions
  FOR SELECT TO authenticated
  USING (true);

-- Manage: Admins/Writers.
CREATE POLICY "page_revisions_manage_policy" ON public.page_revisions
  FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));

CREATE POLICY "post_revisions_manage_policy" ON public.post_revisions
  FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));


-- Ensure Service Role has access to all tables via RLS
DO $$
DECLARE
  tb record;
BEGIN
  FOR tb IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND rowsecurity = true
  LOOP
    EXECUTE format('
      DO $policy$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = %L AND tablename = %L
        ) THEN
          CREATE POLICY %I ON public.%I
            FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
        END IF;
      END
      $policy$;', 
      tb.tablename || '_service_role_policy', 
      tb.tablename, 
      tb.tablename || '_service_role_policy', 
      tb.tablename
    );
  END LOOP;
END
$$;

COMMIT;
