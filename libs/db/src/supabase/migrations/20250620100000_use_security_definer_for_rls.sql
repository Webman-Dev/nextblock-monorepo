-- Drop all previous policies on site_settings to ensure a clean slate.
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to insert into site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow ADMIN and WRITER to modify site_settings" ON public.site_settings;

-- Create a trusted, elevated-privilege function to get the current user's role.
-- SECURITY DEFINER makes it run with the permissions of the function owner, bypassing nested RLS.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This policy grants permission to insert into the site_settings table
-- by using the trusted function to check the user's role.
CREATE POLICY "Allow insert based on user role"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() IN ('ADMIN', 'WRITER')
);

-- This policy grants permission to update the site_settings table
-- by using the trusted function to check the user's role.
CREATE POLICY "Allow update based on user role"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (
  get_my_role() IN ('ADMIN', 'WRITER')
)
WITH CHECK (
  get_my_role() IN ('ADMIN', 'WRITER')
);