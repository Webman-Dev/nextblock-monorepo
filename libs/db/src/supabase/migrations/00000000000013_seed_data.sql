-- 00000000000040_seed_data.sql
-- Consolidated Seed Data: Translations, Logo, Foundational Content

BEGIN;

-- 1. Translations
-- Merged from multiple translation seed files
INSERT INTO public.translations (key, translations) VALUES
('sign_in', '{"en": "Sign in", "fr": "Connexion"}'),
('sign_up', '{"en": "Sign up", "fr": "Inscription"}'),
('sign_out', '{"en": "Sign out", "fr": "Déconnexion"}'),
('dont_have_account', '{"en": "Don''t have an account?", "fr": "Pas encore de compte ?"}'),
('email', '{"en": "Email", "fr": "Email"}'),
('you_at_example_com', '{"en": "you@example.com", "fr": "vous@example.com"}'),
('password', '{"en": "Password", "fr": "Mot de passe"}'),
('forgot_password', '{"en": "Forgot Password?", "fr": "Mot de passe oublié ?"}'),
('your_password', '{"en": "Your password", "fr": "Votre mot de passe"}'),
('signing_in_pending', '{"en": "Signing In...", "fr": "Connexion en cours..."}'),
('already_have_account', '{"en": "Already have an account?", "fr": "Déjà un compte ?"}'),
('signing_up_pending', '{"en": "Signing up...", "fr": "Inscription en cours..."}'),
('reset_password', '{"en": "Reset Password", "fr": "Réinitialiser le mot de passe"}'),
('blog_prefix', '{"en": "article", "fr": "article"}'),
('edit_page', '{"en": "Edit Page", "fr": "Éditer la page"}'),
('edit_post', '{"en": "Edit Post", "fr": "Éditer l''article"}'),
('open_main_menu', '{"en": "Open main menu", "fr": "Ouvrir le menu principal"}'),
('mobile_navigation_menu', '{"en": "Mobile navigation menu", "fr": "Menu de navigation mobile"}'),
('cms_dashboard', '{"en": "CMS Dashboard", "fr": "Tableau de bord CMS"}'),
('update_env_file_warning', '{"en": "Please update .env.local file with anon key and url", "fr": "Veuillez mettre à jour .env.local avec l''anon key et l''URL"}'),
('greeting', '{"en": "Hey, {username}!", "fr": "Salut, {username} !"}'),
('theme_switcher', '{"en": "Theme Switcher", "fr": "Sélecteur de thème"}'),
('theme_light', '{"en": "Light", "fr": "Clair"}'),
('theme_dark', '{"en": "Dark", "fr": "Sombre"}'),
('theme_system', '{"en": "System", "fr": "Système"}'),
('theme_vibrant', '{"en": "Vibrant", "fr": "Vibrant"}'),
('sandbox_mode_banner', '{"en": "Sandbox Mode: Data is public and resets every 15 minutes.", "fr": "Mode Sandbox : Les données sont publiques et réinitialisées toutes les 15 minutes."}'),
('demo_access_title', '{"en": "Demo Access", "fr": "Accès Démo"}'),
('demo_access_desc', '{"en": "This is a demo site. You may use the following credentials to access the admin section:", "fr": "Ceci est un site de démonstration. Vous pouvez utiliser les identifiants suivants pour accéder à l''administration :"}'),
('demo_user_label', '{"en": "User:", "fr": "Utilisateur :"}'),
('demo_password_label', '{"en": "Password:", "fr": "Mot de passe :"}')
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;


-- 2. Site Logo
DO $$
DECLARE
  v_logo_media_id UUID := gen_random_uuid();
  v_admin_id UUID;
BEGIN
  -- Get an admin user ID to set as uploader (optional, fallback to NULL)
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;

  -- Insert the logo into the media table
  INSERT INTO public.media (id, uploader_id, file_name, object_key, file_type, size_bytes, description)
  VALUES (
    v_logo_media_id,
    v_admin_id,
    'nextblock-logo-small.webp',
    '/images/nextblock-logo-small.webp',
    'image/webp',
    10000,
    'NextBlock Site Logo'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = excluded.file_name,
    file_type = excluded.file_type,
    description = excluded.description
  RETURNING id INTO v_logo_media_id;

  -- Insert the logo into the logos table
  INSERT INTO public.logos (name, media_id)
  VALUES ('NextBlock Logo', v_logo_media_id)
  ON CONFLICT DO NOTHING; -- Assuming name is not unique but we don't want to double insert if running multiple times? No unique constraint on name.
  -- Actually, logos table has no unique constraint on name. 
  -- But since this is a seed, we might want to avoid duplicates if run multiple times.
  -- Let's check if it exists.
  IF NOT EXISTS (SELECT 1 FROM public.logos WHERE name = 'NextBlock Logo') THEN
     INSERT INTO public.logos (name, media_id) VALUES ('NextBlock Logo', v_logo_media_id);
  END IF;

END $$;


-- 3. Foundational Content (Pages & Posts Structure)
DO $$
DECLARE
  v_home_page_group_id uuid := gen_random_uuid();
  v_blog_page_group_id uuid := gen_random_uuid();
  v_how_it_works_post_group_id uuid := gen_random_uuid();
  v_en_lang_id bigint;
  v_fr_lang_id bigint;
  v_feature_media_id uuid;
BEGIN
  -- Ensure languages exist (already seeded in setup_languages, but good to be safe/get IDs)
  SELECT id INTO v_en_lang_id FROM public.languages WHERE code = 'en' LIMIT 1;
  SELECT id INTO v_fr_lang_id FROM public.languages WHERE code = 'fr' LIMIT 1;

  IF v_en_lang_id IS NULL OR v_fr_lang_id IS NULL THEN
    RAISE EXCEPTION 'Required languages (en, fr) not found.';
  END IF;

  -- Scaffold Home Pages
  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_en_lang_id, 'Home', 'home', 'published', v_home_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE
    SET title = EXCLUDED.title, status = EXCLUDED.status;
    -- Note: We don't update translation_group_id on conflict to avoid overwriting existing groups if they were manually set?
    -- Actually, for a fresh reset, it doesn't matter. For an update, we might want to preserve.
    -- But the user said "reset the database every time". So we can overwrite.
    
  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_fr_lang_id, 'Accueil', 'accueil', 'published', v_home_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE
    SET title = EXCLUDED.title, status = EXCLUDED.status;

  -- Scaffold Articles Pages
  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_en_lang_id, 'Articles', 'articles', 'published', v_blog_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE
    SET title = EXCLUDED.title, status = EXCLUDED.status;

  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_fr_lang_id, 'Articles', 'articles', 'published', v_blog_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE
    SET title = EXCLUDED.title, status = EXCLUDED.status;

  -- Seed Featured Image
  v_feature_media_id := gen_random_uuid();
  INSERT INTO public.media (id, file_name, object_key, file_type, size_bytes)
  VALUES (v_feature_media_id, 'programmer-upscaled.webp', '/images/programmer-upscaled.webp', 'image/webp', 100000)
  ON CONFLICT (object_key) DO UPDATE
    SET file_name = EXCLUDED.file_name
  RETURNING id INTO v_feature_media_id;

  -- Seed "How It Works" Post
  INSERT INTO public.posts (language_id, title, slug, status, translation_group_id, feature_image_id)
  VALUES (v_en_lang_id, 'How NextBlock Works: A Look Under the Hood', 'how-nextblock-works', 'published', v_how_it_works_post_group_id, v_feature_media_id)
  ON CONFLICT (language_id, slug) DO UPDATE
    SET title = EXCLUDED.title, status = EXCLUDED.status, feature_image_id = EXCLUDED.feature_image_id;

  INSERT INTO public.posts (language_id, title, slug, status, translation_group_id, feature_image_id)
  VALUES (v_fr_lang_id, 'Comment NextBlock Fonctionne : Regard Sous le Capot', 'comment-nextblock-fonctionne', 'published', v_how_it_works_post_group_id, v_feature_media_id)
  ON CONFLICT (language_id, slug) DO UPDATE
    SET title = EXCLUDED.title, status = EXCLUDED.status, feature_image_id = EXCLUDED.feature_image_id;

END $$;

COMMIT;
