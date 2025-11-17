-- Broaden RLS to ensure auth signup trigger can run without RLS conflicts

-- Profiles: allow service_role, authenticated, and anon to insert (trigger runs after auth.users insert)
DROP POLICY IF EXISTS profiles_service_role_insert ON public.profiles;
CREATE POLICY profiles_service_role_insert
ON public.profiles
FOR INSERT
TO service_role, postgres, authenticated, anon
WITH CHECK (true);

-- Profiles: allow reading own row or admin policies remain; no change needed for select/update here

-- Site settings: allow service_role/authenticated/anon to read and update the admin flag row
DROP POLICY IF EXISTS site_settings_admin_seed ON public.site_settings;
CREATE POLICY site_settings_admin_seed
ON public.site_settings
FOR ALL
TO service_role, postgres, authenticated, anon
USING (true)
WITH CHECK (true);
