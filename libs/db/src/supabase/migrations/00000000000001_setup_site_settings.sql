-- 00000000000001_setup_site_settings.sql
-- Setup site_settings table

CREATE TABLE public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB
);

COMMENT ON TABLE public.site_settings IS 'Key-value store for global site settings.';

-- Seed initial copyright setting
INSERT INTO public.site_settings (key, value)
VALUES ('footer_copyright', '{"en": "© {year} Nextblock CMS. All rights reserved.", "fr": "© {year} Nextblock CMS. Tous droits réservés."}')
ON CONFLICT (key) DO NOTHING;

-- Seed initial admin created flag (default false, will be updated by trigger)
INSERT INTO public.site_settings (key, value)
VALUES ('is_admin_created', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
