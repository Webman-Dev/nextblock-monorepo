BEGIN;

-- Grant ALL privileges on content tables to authenticated users
-- RLS policies will still restrict actual access based on roles (Admin/Writer)

GRANT ALL ON TABLE public.pages TO authenticated;
GRANT ALL ON TABLE public.posts TO authenticated;
GRANT ALL ON TABLE public.media TO authenticated;
GRANT ALL ON TABLE public.navigation_items TO authenticated;
GRANT ALL ON TABLE public.languages TO authenticated;
GRANT ALL ON TABLE public.translations TO authenticated;
GRANT ALL ON TABLE public.site_settings TO authenticated;
GRANT ALL ON TABLE public.blocks TO authenticated;

-- Grant usage on sequences to allow inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
