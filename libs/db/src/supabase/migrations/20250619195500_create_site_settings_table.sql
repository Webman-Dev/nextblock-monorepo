-- supabase/migrations/20250619195500_create_site_settings_table.sql

CREATE TABLE public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to do everything
CREATE POLICY "Allow admins full access on site_settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (get_my_claim('user_role') = '"admin"');

-- Allow authenticated users to read settings
CREATE POLICY "Allow authenticated users to read site_settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (true);

-- Seed initial copyright setting
INSERT INTO public.site_settings (key, value)
VALUES ('footer_copyright', '{"en": "© {year} My Ultra-Fast CMS. All rights reserved."}')
ON CONFLICT (key) DO NOTHING;