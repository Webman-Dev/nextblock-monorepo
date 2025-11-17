-- supabase/migrations/20251112143000_seed_additional_translations.sql
-- Adds French values to every existing translation key.

INSERT INTO public.translations (key, translations) VALUES
('sign_in', '{"fr": "Connexion"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('sign_up', '{"fr": "Inscription"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('sign_out', '{"fr": "Déconnexion"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('dont_have_account', '{"fr": "Pas encore de compte ?"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('email', '{"fr": "Email"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('you_at_example_com', '{"fr": "vous@example.com"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('password', '{"fr": "Mot de passe"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('forgot_password', '{"fr": "Mot de passe oublié ?"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('your_password', '{"fr": "Votre mot de passe"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('signing_in_pending', '{"fr": "Connexion en cours..."}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('already_have_account', '{"fr": "Déjà un compte ?"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('signing_up_pending', '{"fr": "Inscription en cours..."}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('reset_password', '{"fr": "Réinitialiser le mot de passe"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('edit_page', '{"fr": "Éditer la page"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('edit_post', '{"fr": "Éditer l''article"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('open_main_menu', '{"fr": "Ouvrir le menu principal"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('mobile_navigation_menu', '{"fr": "Menu de navigation mobile"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('cms_dashboard', '{"fr": "Tableau de bord CMS"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('update_env_file_warning', '{"fr": "Veuillez mettre à jour .env.local avec l''anon key et l''URL"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('greeting', '{"fr": "Salut, {username} !"}')
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;
