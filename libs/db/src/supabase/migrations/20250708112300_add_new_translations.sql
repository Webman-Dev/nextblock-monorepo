INSERT INTO public.translations (key, translations) VALUES
('edit_page', '{"en": "Edit Page"}'),
('edit_post', '{"en": "Edit Post"}'),
('open_main_menu', '{"en": "Open main menu"}'),
('mobile_navigation_menu', '{"en": "Mobile navigation menu"}'),
('cms_dashboard', '{"en": "CMS Dashboard"}'),
('update_env_file_warning', '{"en": "Please update .env.local file with anon key and url"}'),
('greeting', '{"en": "Hey, {username}!"}')
ON CONFLICT (key) DO NOTHING;