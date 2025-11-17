-- Consolidate RLS policies to avoid multiple permissive policies per role/action

-- Profiles: keep a dedicated insert policy only for service_role/postgres (trigger context)
DROP POLICY IF EXISTS profiles_service_role_insert ON public.profiles;
CREATE POLICY profiles_service_role_insert
ON public.profiles
FOR INSERT
TO service_role, postgres
WITH CHECK (true);

-- Site settings: keep a dedicated policy only for service_role/postgres for trigger/maintenance
DROP POLICY IF EXISTS site_settings_admin_seed ON public.site_settings;
CREATE POLICY site_settings_admin_seed
ON public.site_settings
FOR ALL
TO service_role, postgres
USING (true)
WITH CHECK (true);

-- Leave the existing combined authenticated/anon policies in place (no duplicates per role/action)
