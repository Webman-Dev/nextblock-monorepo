BEGIN;

-- Consolidate logo read access into a single policy for the authenticated role.
DROP POLICY IF EXISTS "Allow public read access to logos" ON public.logos;
DROP POLICY IF EXISTS "Allow read access for authenticated users on logos" ON public.logos;

CREATE POLICY "logos_authenticated_select_combined"
ON public.logos
FOR SELECT
TO authenticated
USING (true);

-- Page revisions: remove overlapping SELECT coverage and keep a single policy per action.
DROP POLICY IF EXISTS page_revisions_admin_writer_management ON public.page_revisions;
DROP POLICY IF EXISTS page_revisions_authenticated_read ON public.page_revisions;

CREATE POLICY "page_revisions_authenticated_select_combined"
ON public.page_revisions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "page_revisions_admin_writer_insert"
ON public.page_revisions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

CREATE POLICY "page_revisions_admin_writer_update"
ON public.page_revisions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

CREATE POLICY "page_revisions_admin_writer_delete"
ON public.page_revisions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

-- Post revisions: same treatment as page revisions.
DROP POLICY IF EXISTS post_revisions_admin_writer_management ON public.post_revisions;
DROP POLICY IF EXISTS post_revisions_authenticated_read ON public.post_revisions;

CREATE POLICY "post_revisions_authenticated_select_combined"
ON public.post_revisions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "post_revisions_admin_writer_insert"
ON public.post_revisions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

CREATE POLICY "post_revisions_admin_writer_update"
ON public.post_revisions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

CREATE POLICY "post_revisions_admin_writer_delete"
ON public.post_revisions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

-- Site settings: collapse overlapping policies per action.
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to insert into site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow admins full access on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow insert based on user role" ON public.site_settings;
DROP POLICY IF EXISTS "Allow authenticated users to read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow update based on user role" ON public.site_settings;
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to modify site_settings" ON public.site_settings;

CREATE POLICY "site_settings_authenticated_insert_combined"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

CREATE POLICY "site_settings_authenticated_select_combined"
ON public.site_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "site_settings_authenticated_update_combined"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

CREATE POLICY "site_settings_authenticated_delete_combined"
ON public.site_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

-- Translations: split FOR ALL coverage into distinct policies.
DROP POLICY IF EXISTS "Allow authenticated users to manage translations" ON public.translations;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.translations;

CREATE POLICY "translations_authenticated_select_combined"
ON public.translations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "translations_authenticated_insert_combined"
ON public.translations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "translations_authenticated_update_combined"
ON public.translations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "translations_authenticated_delete_combined"
ON public.translations
FOR DELETE
TO authenticated
USING (true);

COMMIT;
