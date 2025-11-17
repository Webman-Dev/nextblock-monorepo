INSERT INTO public.translations (key, translations) VALUES
('edit_page', '{"en": "Edit Page", "fr": "Éditer la page"}'),
('edit_post', '{"en": "Edit Post", "fr": "Éditer l''article"}'),
('open_main_menu', '{"en": "Open main menu", "fr": "Ouvrir le menu principal"}'),
('mobile_navigation_menu', '{"en": "Mobile navigation menu", "fr": "Menu de navigation mobile"}'),
('cms_dashboard', '{"en": "CMS Dashboard", "fr": "Tableau de bord CMS"}'),
('update_env_file_warning', '{"en": "Please update .env.local file with anon key and url", "fr": "Veuillez mettre à jour .env.local avec l''anon key et l''URL"}'),
('greeting', '{"en": "Hey, {username}!", "fr": "Salut, {username} !"}')
ON CONFLICT (key) DO NOTHING;
