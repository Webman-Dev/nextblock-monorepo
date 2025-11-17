-- Ensure the admin flag exists as a key/value entry
INSERT INTO public.site_settings (key, value)
VALUES ('is_admin_created', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Allow the security definer function (owned by postgres/service_role) to read/update this flag
DROP POLICY IF EXISTS site_settings_admin_seed ON public.site_settings;
CREATE POLICY site_settings_admin_seed
ON public.site_settings
FOR ALL
TO postgres, service_role
USING (true)
WITH CHECK (true);

-- Ensure the trigger can insert profiles under RLS by allowing service_role to insert
DROP POLICY IF EXISTS profiles_service_role_insert ON public.profiles;
CREATE POLICY profiles_service_role_insert
ON public.profiles
FOR INSERT
TO service_role, postgres
WITH CHECK (true);
