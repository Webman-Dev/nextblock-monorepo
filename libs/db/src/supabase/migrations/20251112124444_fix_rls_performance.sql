BEGIN;

-- Ensure profile read access uses a single policy and wraps auth.uid() safely.
DROP POLICY IF EXISTS "Allow user to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_can_read_profiles" ON public.profiles;

CREATE POLICY "authenticated_can_read_profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  (id = (SELECT auth.uid())) OR
  (public.get_current_user_role() = 'ADMIN')
);
COMMENT ON POLICY "authenticated_can_read_profiles" ON public.profiles IS 'Authenticated users can read their own profile; admins can read any profile.';

-- Harden storage.objects ownership checks.
DROP POLICY IF EXISTS "allow_authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_updates" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_deletes" ON storage.objects;

CREATE POLICY "allow_authenticated_uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public' AND owner = (SELECT auth.uid()));

CREATE POLICY "allow_authenticated_updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'public' AND owner = (SELECT auth.uid()));

CREATE POLICY "allow_authenticated_deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'public' AND owner = (SELECT auth.uid()));

-- Keep select policy as-is (bucket scoped) since it does not reference auth.uid().

-- Update site_settings policies to avoid initplan warnings.
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to insert into site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to update site_settings" ON public.site_settings;

CREATE POLICY "Allow ADMIN and WRITER to insert into site_settings" ON public.site_settings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')
  )
);

CREATE POLICY "Allow ADMIN and WRITER to update site_settings" ON public.site_settings
FOR UPDATE TO authenticated
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

COMMIT;
