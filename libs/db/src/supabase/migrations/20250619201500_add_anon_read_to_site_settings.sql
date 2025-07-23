-- supabase/migrations/20250619201500_add_anon_read_to_site_settings.sql

CREATE POLICY "Allow public read access to site_settings"
ON public.site_settings
FOR SELECT
TO anon
USING (true);