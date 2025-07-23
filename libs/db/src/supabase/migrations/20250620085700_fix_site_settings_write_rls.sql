-- Drop existing policies if they exist to avoid conflicts.
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to insert into site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to modify site_settings" ON public.site_settings;

-- This policy grants permission to insert into the site_settings table
-- to any authenticated user whose role in the profiles table is 'ADMIN' or 'WRITER'.
CREATE POLICY "Allow ADMIN and WRITER to insert into site_settings"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'WRITER')
);

-- This policy grants permission to update the site_settings table
-- to any authenticated user whose role in the profiles table is 'ADMIN' or 'WRITER'.
CREATE POLICY "Allow ADMIN and WRITER to update site_settings"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'WRITER')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'WRITER')
);