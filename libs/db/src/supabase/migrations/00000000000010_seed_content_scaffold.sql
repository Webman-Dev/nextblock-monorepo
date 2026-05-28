-- 00000000000010_seed_content_scaffold.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000033_seed_logo_and_content_scaffold.sql
-- Foundational translations, logo assets, and starter content scaffolding.

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
('auth.signup_form_description', '{"en": "Create your account in one quick step. We''ll email you a confirmation link before you finish your profile.", "fr": "Créez votre compte en une étape rapide. Nous vous enverrons un lien de confirmation avant de terminer votre profil."}'),
('auth.signup_success_badge', '{"en": "Signup received", "fr": "Inscription reçue"}'),
('auth.signup_success_title', '{"en": "Check your inbox", "fr": "Vérifiez votre boîte de réception"}'),
('auth.signup_success_step_confirm', '{"en": "Open the email we sent and confirm your address.", "fr": "Ouvrez l''e-mail envoyé et confirmez votre adresse."}'),
('auth.signup_success_step_profile', '{"en": "After confirmation, we''ll bring you to your profile to finish setup.", "fr": "Après confirmation, nous vous amènerons à votre profil pour terminer la configuration."}'),
('auth.signup_success_step_spam', '{"en": "If it doesn''t arrive soon, check spam, junk, or promotions.", "fr": "S''il n''arrive pas bientôt, vérifiez les dossiers spam, indésirables ou promotions."}'),
('auth.signup_use_different_email', '{"en": "Use a different email", "fr": "Utiliser une autre adresse e-mail"}'),
('auth.back_to_sign_in', '{"en": "Back to sign in", "fr": "Retour à la connexion"}'),
('auth.signup_rate_limit', '{"en": "You''re trying too quickly. Please wait a moment before requesting another confirmation email.", "fr": "Vous allez trop vite. Veuillez attendre un instant avant de demander un nouvel e-mail de confirmation."}'),
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
    'images/nextblock-logo-small.webp',
    'image/webp',
    10000,
    'NextBlock™ Site Logo'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = excluded.file_name,
    file_type = excluded.file_type,
    description = excluded.description
  RETURNING id INTO v_logo_media_id;

  -- Insert the logo into the logos table
  INSERT INTO public.logos (name, media_id)
  VALUES ('NextBlock™ Logo', v_logo_media_id)
  ON CONFLICT DO NOTHING; -- Assuming name is not unique but we don't want to double insert if running multiple times? No unique constraint on name.
  -- Actually, logos table has no unique constraint on name. 
  -- But since this is a seed, we might want to avoid duplicates if run multiple times.
  -- Let's check if it exists.
  IF NOT EXISTS (SELECT 1 FROM public.logos WHERE name = 'NextBlock™ Logo') THEN
     INSERT INTO public.logos (name, media_id) VALUES ('NextBlock™ Logo', v_logo_media_id);
  END IF;

END $$;



-- 3. Foundational Content (Pages & Posts Structure)
DO $$
DECLARE
  v_home_page_group_id uuid := gen_random_uuid();
  v_blog_page_group_id uuid := gen_random_uuid();
  v_how_it_works_post_group_id uuid := gen_random_uuid();
  v_setup_post_group_id uuid := gen_random_uuid();
  v_commerce_post_group_id uuid := gen_random_uuid();
  v_contact_page_group_id uuid := gen_random_uuid();
  v_en_lang_id bigint;
  v_fr_lang_id bigint;
  v_architecture_media_id uuid;
  v_extensibility_media_id uuid;
  v_included_media_id uuid;
  v_setup_media_id uuid;
  v_commerce_plan_media_id uuid;
  v_commerce_media_id uuid;
BEGIN
  SELECT id INTO v_en_lang_id FROM public.languages WHERE code = 'en' LIMIT 1;
  SELECT id INTO v_fr_lang_id FROM public.languages WHERE code = 'fr' LIMIT 1;

  IF v_en_lang_id IS NULL OR v_fr_lang_id IS NULL THEN
    RAISE EXCEPTION 'Required languages (en, fr) not found.';
  END IF;

  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_en_lang_id, 'Home', 'home', 'published', v_home_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_fr_lang_id, 'Accueil', 'accueil', 'published', v_home_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_en_lang_id, 'Articles', 'articles', 'published', v_blog_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_fr_lang_id, 'Articles', 'articles', 'published', v_blog_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_en_lang_id, 'Contact Us', 'contact', 'published', v_contact_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES (v_fr_lang_id, 'Contactez-nous', 'contact', 'published', v_contact_page_group_id)
  ON CONFLICT (language_id, slug) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

  v_architecture_media_id := gen_random_uuid();
  INSERT INTO public.media (id, file_name, object_key, file_type, size_bytes, width, height, description)
  VALUES (
    v_architecture_media_id,
    'NBcover.webp',
    'images/NBcover.webp',
    'image/webp',
    180000,
    1024,
    572,
    'NextBlock™ architecture overview cover image'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = EXCLUDED.file_name,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    description = EXCLUDED.description
  RETURNING id INTO v_architecture_media_id;

  v_extensibility_media_id := gen_random_uuid();
  INSERT INTO public.media (id, file_name, object_key, file_type, size_bytes, width, height, description)
  VALUES (
    v_extensibility_media_id,
    'extensibility.webp',
    'images/extensibility.webp',
    'image/webp',
    246808,
    1024,
    559,
    'NextBlock™ extensibility editorial artwork'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = EXCLUDED.file_name,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    description = EXCLUDED.description
  RETURNING id INTO v_extensibility_media_id;

  v_included_media_id := gen_random_uuid();
  INSERT INTO public.media (id, file_name, object_key, file_type, size_bytes, width, height, description)
  VALUES (
    v_included_media_id,
    'included.webp',
    'images/included.webp',
    'image/webp',
    237478,
    1024,
    559,
    'NextBlock™ getting-started platform artwork'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = EXCLUDED.file_name,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    description = EXCLUDED.description
  RETURNING id INTO v_included_media_id;

  v_setup_media_id := gen_random_uuid();
  INSERT INTO public.media (id, file_name, object_key, file_type, size_bytes, width, height, description)
  VALUES (
    v_setup_media_id,
    'programmer-upscaled.webp',
    'images/programmer-upscaled.webp',
    'image/webp',
    780000,
    8192,
    2632,
    'NextBlock™ setup guide cover image'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = EXCLUDED.file_name,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    description = EXCLUDED.description
  RETURNING id INTO v_setup_media_id;

  v_commerce_plan_media_id := gen_random_uuid();
  INSERT INTO public.media (id, file_name, object_key, file_type, size_bytes, width, height, description)
  VALUES (
    v_commerce_plan_media_id,
    'commerce-plan.webp',
    'images/commerce-plan.webp',
    'image/webp',
    269854,
    1024,
    559,
    'NextBlock™ commerce roadmap artwork'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = EXCLUDED.file_name,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    description = EXCLUDED.description
  RETURNING id INTO v_commerce_plan_media_id;

  v_commerce_media_id := gen_random_uuid();
  INSERT INTO public.media (id, file_name, object_key, file_type, size_bytes, width, height, description)
  VALUES (
    v_commerce_media_id,
    'commerce-wide.webp',
    'images/commerce-wide.webp',
    'image/webp',
    250584,
    1024,
    434,
    'NextBlock™ Commerce editorial feature image'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = EXCLUDED.file_name,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    description = EXCLUDED.description
  RETURNING id INTO v_commerce_media_id;

  INSERT INTO public.posts (language_id, title, slug, label, status, excerpt, subtitle, translation_group_id, feature_image_id)
  VALUES (
    v_en_lang_id,
    'How NextBlock™ Works: A Look Under the Hood',
    'how-nextblock-works',
    'Architecture',
    'published',
    'Under the hood of the monorepo, block registry, and editor stack that power NextBlock.',
    'A guided tour of the monorepo, block registry, editor stack, and open-core architecture behind NextBlock.',
    v_how_it_works_post_group_id,
    v_architecture_media_id
  )
  ON CONFLICT (language_id, slug) DO UPDATE
  SET
    title = EXCLUDED.title,
    label = EXCLUDED.label,
    excerpt = EXCLUDED.excerpt,
    subtitle = EXCLUDED.subtitle,
    status = EXCLUDED.status,
    feature_image_id = EXCLUDED.feature_image_id;

  INSERT INTO public.posts (language_id, title, slug, label, status, excerpt, subtitle, translation_group_id, feature_image_id)
  VALUES (
    v_fr_lang_id,
    'Comment NextBlock™ Fonctionne : Regard Sous le Capot',
    'comment-nextblock-fonctionne',
    'Architecture',
    'published',
    'Sous le capot du monorepo, du registre de blocs et de l editeur qui propulsent NextBlock.',
    'Une visite guidee du monorepo, du registre de blocs, de l editeur et de l architecture open-core de NextBlock.',
    v_how_it_works_post_group_id,
    v_architecture_media_id
  )
  ON CONFLICT (language_id, slug) DO UPDATE
  SET
    title = EXCLUDED.title,
    label = EXCLUDED.label,
    excerpt = EXCLUDED.excerpt,
    subtitle = EXCLUDED.subtitle,
    status = EXCLUDED.status,
    feature_image_id = EXCLUDED.feature_image_id;

  INSERT INTO public.posts (language_id, title, slug, label, status, excerpt, subtitle, translation_group_id, feature_image_id)
  VALUES (
    v_en_lang_id,
    'How to Setup NextBlock: From Scratch',
    'how-to-setup-nextblock',
    'Getting Started',
    'published',
    'Installation paths, launch checklists, and setup notes for teams adopting NextBlock.',
    'Two clear ways to launch NextBlock: the full monorepo for contributors, or the CLI for a fast standalone setup.',
    v_setup_post_group_id,
    v_setup_media_id
  )
  ON CONFLICT (language_id, slug) DO UPDATE
  SET
    title = EXCLUDED.title,
    label = EXCLUDED.label,
    excerpt = EXCLUDED.excerpt,
    subtitle = EXCLUDED.subtitle,
    status = EXCLUDED.status,
    feature_image_id = EXCLUDED.feature_image_id;

  INSERT INTO public.posts (language_id, title, slug, label, status, excerpt, subtitle, translation_group_id, feature_image_id)
  VALUES (
    v_fr_lang_id,
    'Comment Configurer NextBlock™ : Guide Complet',
    'comment-configurer-nextblock',
    'Mise En Route',
    'published',
    'Parcours d installation, checklist de lancement et notes de configuration pour adopter NextBlock.',
    'Deux chemins simples pour lancer NextBlock™ : le monorepo complet pour les contributeurs, ou le CLI pour un demarrage rapide.',
    v_setup_post_group_id,
    v_setup_media_id
  )
  ON CONFLICT (language_id, slug) DO UPDATE
  SET
    title = EXCLUDED.title,
    label = EXCLUDED.label,
    excerpt = EXCLUDED.excerpt,
    subtitle = EXCLUDED.subtitle,
    status = EXCLUDED.status,
    feature_image_id = EXCLUDED.feature_image_id;

  INSERT INTO public.posts (language_id, title, slug, label, status, excerpt, subtitle, translation_group_id, feature_image_id)
  VALUES (
    v_en_lang_id,
    'NextBlock™ Commerce: Multi-Currency, Tax Sync & Beyond',
    'nextblock-commerce-guide',
    'Commerce',
    'published',
    'Storefront architecture, checkout flows, and premium commerce capabilities inside NextBlock.',
    'A closer look at the commerce module, from multi-currency and tax sync to shipping, inventory, and provider-aware checkout.',
    v_commerce_post_group_id,
    v_commerce_media_id
  )
  ON CONFLICT (language_id, slug) DO UPDATE
  SET
    title = EXCLUDED.title,
    label = EXCLUDED.label,
    excerpt = EXCLUDED.excerpt,
    subtitle = EXCLUDED.subtitle,
    status = EXCLUDED.status,
    feature_image_id = EXCLUDED.feature_image_id;

  INSERT INTO public.posts (language_id, title, slug, status, excerpt, translation_group_id, feature_image_id)
  VALUES (
    v_fr_lang_id,
    'NextBlock™ Commerce : Multi-Devises, Taxes Automatiques et Plus',
    'guide-commerce-nextblock',
    'published',
    'Un apercu du module commerce : multi-devises, sync taxes, expédition, inventaire et paiements connectes.',
    v_commerce_post_group_id,
    v_commerce_media_id
  )
  ON CONFLICT (language_id, slug) DO UPDATE
  SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    status = EXCLUDED.status,
    feature_image_id = EXCLUDED.feature_image_id;

  UPDATE public.posts
  SET
    label = 'Architecture',
    excerpt = 'Under the hood of the monorepo, block registry, and editor stack that power NextBlock.',
    subtitle = 'A guided tour of the monorepo, block registry, editor stack, and open-core architecture behind NextBlock.'
  WHERE slug = 'how-nextblock-works';

  UPDATE public.posts
  SET
    label = 'Architecture',
    excerpt = 'Sous le capot du monorepo, du registre de blocs et de l editeur qui propulsent NextBlock.',
    subtitle = 'Une visite guidee du monorepo, du registre de blocs, de l editeur et de l architecture open-core de NextBlock.'
  WHERE slug = 'comment-nextblock-fonctionne';

  UPDATE public.posts
  SET
    label = 'Getting Started',
    excerpt = 'Installation paths, launch checklists, and setup notes for teams adopting NextBlock.',
    subtitle = 'Two clear ways to launch NextBlock: the full monorepo for contributors, or the CLI for a fast standalone setup.'
  WHERE slug = 'how-to-setup-nextblock';

  UPDATE public.posts
  SET
    label = 'Mise En Route',
    excerpt = 'Parcours d installation, checklist de lancement et notes de configuration pour adopter NextBlock.',
    subtitle = 'Deux chemins simples pour lancer NextBlock™ : le monorepo complet pour les contributeurs, ou le CLI pour un demarrage rapide.'
  WHERE slug = 'comment-configurer-nextblock';

  UPDATE public.posts
  SET
    label = 'Commerce',
    excerpt = 'Storefront architecture, checkout flows, and premium commerce capabilities inside NextBlock.',
    subtitle = 'A closer look at the commerce module, from multi-currency and tax sync to shipping, inventory, and provider-aware checkout.'
  WHERE slug = 'nextblock-commerce-guide';

  UPDATE public.posts
  SET
    label = 'Commerce',
    excerpt = 'Architecture boutique, parcours de paiement et fonctions commerce premium au coeur de NextBlock.',
    subtitle = 'Un apercu du module commerce : multi-devises, sync taxes, expedition, inventaire et paiements connectes.'
  WHERE slug = 'guide-commerce-nextblock';

END $$;

COMMIT;
-- English Home + Blog blocks
DO $seed$
DECLARE
  v_en_lang_id BIGINT;
  v_home_page_id BIGINT;
  v_blog_page_id BIGINT;
  v_contact_page_id BIGINT;
BEGIN
  SELECT id INTO v_en_lang_id FROM public.languages WHERE code = 'en' LIMIT 1;
  IF v_en_lang_id IS NULL THEN RAISE EXCEPTION 'English language not found.'; END IF;

  SELECT id INTO v_home_page_id FROM public.pages WHERE slug = 'home' AND language_id = v_en_lang_id ORDER BY created_at DESC LIMIT 1;
  IF v_home_page_id IS NULL THEN RAISE EXCEPTION 'English Home page not found.'; END IF;

  SELECT id INTO v_blog_page_id FROM public.pages WHERE slug = 'articles' AND language_id = v_en_lang_id ORDER BY created_at DESC LIMIT 1;
  IF v_blog_page_id IS NULL THEN RAISE EXCEPTION 'English Articles page not found.'; END IF;

  SELECT id INTO v_contact_page_id FROM public.pages WHERE slug = 'contact' AND language_id = v_en_lang_id ORDER BY created_at DESC LIMIT 1;
  IF v_contact_page_id IS NULL THEN RAISE EXCEPTION 'English Contact page not found.'; END IF;

  DELETE FROM public.blocks WHERE page_id = v_home_page_id;
  DELETE FROM public.blocks WHERE page_id = v_blog_page_id;
  DELETE FROM public.blocks WHERE page_id = v_contact_page_id;

  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order") VALUES
  (v_home_page_id, v_en_lang_id, 'hero',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#020817","position":0},{"color":"#0f172a","position":50},{"color":"#1e293b","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"xl","vertical_alignment":"center","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<h1 class=''text-5xl md:text-6xl font-extrabold tracking-tight text-white text-center leading-tight''>Build <span class=''relative inline-block mx-1 group''><span class=''absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 translate-y-1 md:translate-y-2 transform -skew-x-12 rounded-sm shadow-lg group-hover:skew-x-0 transition-transform duration-300 ease-out''></span><span class=''relative text-white italic px-1''>Blazing-Fast</span></span><br class=''md:hidden'' /> Websites.</h1>"}},{"block_type":"text","content":{"html_content":"<p class=''text-xl text-slate-300 text-center max-w-3xl mx-auto mt-4 leading-relaxed''>NextBlock™ is the open-source, developer-first Next.js CMS that merges 100% Lighthouse scores with a powerful visual block editor.</p>"}},{"block_type":"button","content":{"text":"Get Started","url":"/article/how-to-setup-nextblock","variant":"default","size":"lg","position":"center"}},{"block_type":"button","content":{"text":"View on GitHub","url":"https://github.com/nextblock-cms/nextblock","variant":"outline","size":"lg","position":"center"}},{"block_type":"text","content":{"html_content":"<div class=''flex flex-wrap justify-center gap-6 text-sm uppercase tracking-wide text-slate-400 mt-8''><a href=''https://github.com/nextblock-cms'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>GitHub</a><a href=''https://x.com/NextBlockCMS'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>X</a><a href=''https://www.linkedin.com/in/nextblock/'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>LinkedIn</a><a href=''https://dev.to/nextblockcms'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>Dev.to</a><a href=''https://www.npmjs.com/~nextblockcms'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>npm</a></div>"}}],[{"block_type":"text","content":{"html_content":"<div class=''p-10 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group''><div class=''absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500''></div><div class=''relative z-10''><p class=''text-xs text-white uppercase tracking-widest font-semibold mb-2''>Why teams switch</p><p class=''text-3xl font-bold text-white mb-2''>100% Lighthouse</p><p class=''text-base text-slate-300 mb-6''>Edge-rendered marketing sites, launches, and docs with uncompromising performance.</p><ul class=''space-y-3 text-sm text-slate-200''><li><span class=''text-blue-400 mr-2''>&#10003;</span> Next.js 16 with ISR and edge caching</li><li><span class=''text-blue-400 mr-2''>&#10003;</span> Supabase auth, data, and storage</li><li><span class=''text-blue-400 mr-2''>&#10003;</span> Notion-style block editor powered by Tiptap</li></ul><div class=''mt-6 rounded-2xl overflow-hidden border border-white/10 shadow-lg''><img src=''/images/NBcover.webp'' alt=''Nextblock cover showcasing dashboards and blocks'' class=''w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700'' fetchpriority=''high'' /></div></div></div>"}}]]}'::jsonb, 0),

  (v_home_page_id, v_en_lang_id, 'section',
  '{"container_type":"container","background":{"type":"none"},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"heading","content":{"level":2,"text_content":"Key Features: The Three Pillars of NextBlock™","textAlign":"center"}},{"block_type":"text","content":{"html_content":"<p class=''text-lg text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto''>NextBlock™ is a holistic platform that unites performance, editorial experience, and developer control so every stakeholder delivers their best work.</p>"}},{"block_type":"text","content":{"html_content":"<div class=''grid gap-8 md:grid-cols-3 mt-12''><div class=''p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300''><div class=''w-12 h-12 rounded-xl flex items-center justify-center text-black dark:text-white mb-6''><svg class=''w-6 h-6'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M13 10V3L4 14h7v7l9-11h-7z''></path></svg></div><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>Built for Speed.</h3><p class=''text-sm text-slate-600 dark:text-slate-400 leading-relaxed''>Architected for 100% Lighthouse scores with global delivery and near-instant FCP.</p><ul class=''mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400''><li><strong class=''text-slate-800 dark:text-slate-200''>Edge Caching &amp; ISR:</strong> Serve pages worldwide.</li><li><strong class=''text-slate-800 dark:text-slate-200''>Critical CSS:</strong> Inline styles to eliminate blocking.</li><li><strong class=''text-slate-800 dark:text-slate-200''>Image Opt:</strong> AVIF &amp; blurred placeholders.</li></ul></div><div class=''p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300''><div class=''w-12 h-12 rounded-xl flex items-center justify-center text-black dark:text-white mb-6''><svg class=''w-6 h-6'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z''></path></svg></div><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>Editor-First Experience.</h3><p class=''text-sm text-slate-600 dark:text-slate-400 leading-relaxed''>A low-code, Notion-style block editor empowers teams to ship pages without engineering help.</p><ul class=''mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400''><li><strong class=''text-slate-800 dark:text-slate-200''>Notion-Style:</strong> Slash commands &amp; drag-and-drop.</li><li><strong class=''text-slate-800 dark:text-slate-200''>Bilingual:</strong> Manage locales from one interface.</li><li><strong class=''text-slate-800 dark:text-slate-200''>History:</strong> Restore any version with a click.</li></ul></div><div class=''p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300''><div class=''w-12 h-12 bg-white/50 dark:bg-white/10 rounded-xl flex items-center justify-center mb-6''><svg class=''w-6 h-6 text-slate-900 dark:text-white'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10''></path></svg></div><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>Infinitely Extensible.</h3><p class=''text-sm text-slate-700 dark:text-slate-200 leading-relaxed''>Open-source control with a clean Nx monorepo and a typed SDK for limitless customization.</p><ul class=''mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200''><li><strong class=''text-slate-900 dark:text-white''>Open Source:</strong> Own the code &amp; data forever.</li><li><strong class=''text-slate-900 dark:text-white''>Nx Monorepo:</strong> Scale confidently.</li><li><strong class=''text-slate-900 dark:text-white''>Developer SDK:</strong> Scaffold blocks in minutes.</li></ul></div></div>"}}]]}'::jsonb, 1),

  (v_home_page_id, v_en_lang_id, 'section',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"180deg","stops":[{"color":"#0f172a","position":0},{"color":"#020817","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<h2 class=''text-3xl md:text-4xl font-bold text-white text-center mb-6''>Built with the Best.</h2>"}},{"block_type":"text","content":{"html_content":"<p class=''text-slate-400 text-center max-w-2xl mx-auto''>Every layer of NextBlock™ leans on proven developer-first technology so the platform feels familiar, performant, and trustworthy from day one.</p><div class=''grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-10 text-sm font-semibold text-center text-white''><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Next.js</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>React</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Supabase</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Stripe</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Tailwind</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Tiptap</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Vercel</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Nx</div></div>"}},{"block_type":"text","content":{"html_content":"<h2 class=''text-3xl md:text-4xl font-bold text-white text-center mb-6 mt-16''>Powerful for Developers. Intuitive for Editors.</h2>"}},{"block_type":"text","content":{"html_content":"<div class=''grid md:grid-cols-2 gap-8 mt-10 text-white''><div class=''p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm''><h3 class=''text-xl font-bold mb-6 text-blue-400''>For Content Creators</h3><ul class=''space-y-4 text-sm text-slate-300''><li><strong class=''text-white block mb-1''>Intuitive Block Editor</strong>Drag-and-drop layouts with a Notion-like interface.</li><li><strong class=''text-white block mb-1''>Rich Content Blocks</strong>Deploy heroes, galleries, testimonials, and more in one click.</li><li><strong class=''text-white block mb-1''>Effortless Media Management</strong>Organize assets with folders, tags, and bulk actions.</li><li><strong class=''text-white block mb-1''>Worry-Free Revisions</strong>Automatic version history with instant restore.</li></ul></div><div class=''p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm''><h3 class=''text-xl font-bold mb-6 text-purple-400''>For Developers</h3><ul class=''space-y-4 text-sm text-slate-300''><li><strong class=''text-white block mb-1''>Next.js 16 Core</strong>Server Components, ISR, and Edge Functions ready out of the box.</li><li><strong class=''text-white block mb-1''>Supabase Integration</strong>Postgres, auth, storage, and real-time APIs without glue code.</li><li><strong class=''text-white block mb-1''>Monorepo Ready</strong>Nx-powered dev experience for scalable architectures.</li><li><strong class=''text-white block mb-1''>Extensible Block SDK</strong>Ship fully typed custom blocks and widgets.</li></ul></div></div>"}}]]}'::jsonb, 2),
  (v_home_page_id, v_en_lang_id, 'section',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#022c22","position":0},{"color":"#0f172a","position":50},{"color":"#020817","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"xl","vertical_alignment":"center","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<p class=''text-xs uppercase tracking-[0.25em] text-emerald-400 font-bold mb-4''>Now Available — Premium Module</p><h2 class=''text-4xl md:text-5xl font-bold text-white mb-6 leading-tight''>Turn Your CMS Into<br/>a Full Storefront.</h2><p class=''text-lg text-slate-300 max-w-2xl leading-relaxed mb-8''>NextBlock™ Commerce transforms your content platform into a complete e-commerce engine. Products, checkout, multi-currency, taxes, shipping, invoices — all natively integrated into the block editor you already know.</p>"}},{"block_type":"button","content":{"text":"Explore Commerce Features →","url":"/article/nextblock-commerce-guide","variant":"default","size":"lg"}},{"block_type":"button","content":{"text":"Get a License","url":"https://nextblock.dev/product/nextblock-commerce-pro-commerce-license","variant":"outline","size":"lg"}}],[{"block_type":"text","content":{"html_content":"<div class=''rounded-3xl overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-white/5 to-emerald-500/5 shadow-2xl p-6 backdrop-blur-sm''><img src=''/images/commerce-square.webp'' alt=''NextBlock™ Commerce dashboard showing product management'' class=''w-full h-auto rounded-2xl shadow-lg'' /><div class=''mt-4 grid grid-cols-3 gap-3 text-center''><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-emerald-400''>∞</p><p class=''text-xs text-slate-400''>Currencies</p></div><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-emerald-400''>2</p><p class=''text-xs text-slate-400''>Providers</p></div><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-emerald-400''>Auto</p><p class=''text-xs text-slate-400''>Tax Sync</p></div></div></div>"}}]]}'::jsonb, 3),

  (v_home_page_id, v_en_lang_id, 'section',
  '{"container_type":"container","background":{"type":"none"},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"heading","content":{"level":2,"text_content":"Everything You Need to Sell Online","textAlign":"center"}},{"block_type":"text","content":{"html_content":"<p class=''text-lg text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto mb-12''>NextBlock™ Commerce ships a complete e-commerce toolkit so you can go from catalog to checkout without third-party plugins.</p><div class=''grid gap-6 md:grid-cols-2 lg:grid-cols-3''><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><div class=''w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4''><svg class=''w-5 h-5 text-emerald-600 dark:text-emerald-400'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z''></path></svg></div><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Multi-Currency</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Real-time FX rates, rounding modes, charm pricing, and automatic product price sync across unlimited currencies.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><div class=''w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4''><svg class=''w-5 h-5 text-emerald-600 dark:text-emerald-400'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z''></path></svg></div><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Tax Automation</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Manual stacked tax rates (GST + PST) or fully automatic calculation via Stripe Tax — you choose.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><div class=''w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4''><svg class=''w-5 h-5 text-emerald-600 dark:text-emerald-400'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4''></path></svg></div><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Shipping Zones</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Zone-based rate resolution with country and state matching, per-currency pricing, and free-shipping thresholds.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><div class=''w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4''><svg class=''w-5 h-5 text-emerald-600 dark:text-emerald-400'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z''></path></svg></div><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Stripe &amp; Freemius Checkout</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Stripe for physical products, Freemius for digital licensing — provider-aware checkout with inventory validation.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><div class=''w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4''><svg class=''w-5 h-5 text-emerald-600 dark:text-emerald-400'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4''></path></svg></div><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Inventory Tracking</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Automatic quantity deduction on payment with resilient fallback paths and variant-level stock management.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><div class=''w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4''><svg class=''w-5 h-5 text-emerald-600 dark:text-emerald-400'' fill=''none'' stroke=''currentColor'' viewBox=''0 0 24 24''><path stroke-linecap=''round'' stroke-linejoin=''round'' stroke-width=''2'' d=''M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z''></path></svg></div><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Orders &amp; Invoices</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Full order lifecycle management, stable invoice numbering, printable documents, and exportable order reports.</p></div></div>"}}]]}'::jsonb, 4),

  (v_home_page_id, v_en_lang_id, 'section',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#1e1b4b","position":0},{"color":"#0f172a","position":50},{"color":"#020817","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"xl","vertical_alignment":"center","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<div class=''rounded-3xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-white/5 to-violet-500/5 shadow-2xl p-6 backdrop-blur-sm''><img src=''/images/cortex-ai-square.webp'' alt=''NextBlock™ Cortex AI dashboard showing block generator'' class=''w-full h-auto rounded-2xl shadow-lg'' /><div class=''mt-4 grid grid-cols-3 gap-3 text-center''><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-violet-400''>OpenRouter</p><p class=''text-xs text-slate-400''>AI Gateway</p></div><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-violet-400''>BYOK</p><p class=''text-xs text-slate-400''>Cost Control</p></div><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-violet-400''>Zod</p><p class=''text-xs text-slate-400''>Typed Blocks</p></div></div></div>"}}],[{"block_type":"text","content":{"html_content":"<p class=''text-xs uppercase tracking-[0.25em] text-violet-400 font-bold mb-4''>Now Available — AI Copilot</p><h2 class=''text-4xl md:text-5xl font-bold text-white mb-6 leading-tight''>Supercharge Your<br/>Content with AI.</h2><p class=''text-lg text-slate-300 max-w-2xl leading-relaxed mb-8''>NextBlock™ Cortex AI brings native block-level intelligence directly to your editor. Generate copy, refactor structures, and automate translations in one click, built directly on our high-performance architecture.</p>"}},{"block_type":"button","content":{"text":"Explore AI Capabilities →","url":"/article/nextblock-cortex-ai-guide","variant":"default","size":"lg"}},{"block_type":"button","content":{"text":"Get a License","url":"https://nextblock.dev/product/nextblock-cortex-ai-cortex-ai-license","variant":"outline","size":"lg"}}]]}'::jsonb, 5),

  (v_home_page_id, v_en_lang_id, 'section',
  '{"container_type":"container","background":{"type":"none"},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"heading","content":{"level":2,"text_content":"More Than a CMS. An Ecosystem.","textAlign":"center"}},{"block_type":"text","content":{"html_content":"<p class=''text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto''>NextBlock™ is building a sustainable open-core roadmap so the platform grows with your business.</p>"}},{"block_type":"text","content":{"html_content":"<div class=''grid gap-6 lg:grid-cols-[0.75fr_1.25fr] mt-10 items-stretch''><div class=''overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-950 shadow-2xl''><img src=''/images/goals.webp'' alt=''Roadmap board outlining the NextBlock™ ecosystem and premium module direction'' class=''h-full w-full object-cover'' /><div class=''border-t border-white/10 bg-slate-950/95 px-6 py-5''><p class=''text-xs uppercase tracking-[0.24em] text-emerald-300 mb-2 font-bold''>Roadmap in motion</p><p class=''text-sm text-slate-300 mb-0''>Commerce ships first, then the broader ecosystem grows around plugins, blocks, and partner-built modules.</p></div></div><div class=''grid gap-6''><div class=''p-10 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/5 dark:to-white/5 hover:border-emerald-500/40 transition-colors''><p class=''text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2 font-bold''>Available now</p><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>NextBlock™ Commerce</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Transform your site into a composable storefront with products, checkout, multi-currency pricing, tax automation, and commerce blocks that live beside your editorial content.</p></div><div class=''p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-violet-500/30 transition-colors''><p class=''text-xs uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-2 font-bold''>Build the future</p><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>Plugin and block marketplace</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>A community marketplace gives developers room to publish, sell, and distribute custom blocks, themes, integrations, and partner modules.</p></div></div></div>"}},{"block_type":"heading","content":{"level":2,"text_content":"Join Our Community.","textAlign":"center"}},{"block_type":"text","content":{"html_content":"<p class=''text-slate-600 dark:text-slate-400 text-center mx-auto''>NextBlock™ is being built in the open. Star the repo, share feedback, and help define the future of performance-first content management.</p>"}},{"block_type":"text","content":{"html_content":"<div class=''grid gap-4 md:grid-cols-3 mt-10 text-sm''><a class=''p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]'' href=''https://github.com/nextblock-cms'' target=''_blank'' rel=''noopener noreferrer''><strong class=''block text-base text-slate-900 dark:text-white mb-1''>GitHub</strong><span class=''text-slate-600 dark:text-slate-400''>Star the repo &amp; contribute</span></a><a class=''p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]'' href=''https://x.com/NextBlockCMS'' target=''_blank'' rel=''noopener noreferrer''><strong class=''block text-base text-slate-900 dark:text-white mb-1''>X (Twitter)</strong><span class=''text-slate-600 dark:text-slate-400''>Follow updates &amp; announcements</span></a><a class=''p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]'' href=''https://dev.to/nextblockcms'' target=''_blank'' rel=''noopener noreferrer''><strong class=''block text-base text-slate-900 dark:text-white mb-1''>Dev.to</strong><span class=''text-slate-600 dark:text-slate-400''>Read technical deep dives</span></a></div>"}}]]}'::jsonb, 6),

  (v_home_page_id, v_en_lang_id, 'section',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"180deg","stops":[{"color":"#020817","position":0},{"color":"#0f172a","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<h2 class=''text-3xl md:text-4xl font-bold text-center text-white mb-4''>Have Questions?</h2>"}},{"block_type":"text","content":{"html_content":"<p class=''text-center text-lg text-slate-300 mx-auto mb-8''>NextBlock™ partners with early adopters to co-build features, sponsor modules, and shape the product direction.</p>"}},{"block_type":"button","content":{"text":"Get in Touch","url":"/contact","variant":"default","size":"lg","position":"center"}}]]}'::jsonb, 6),

  (v_blog_page_id, v_en_lang_id, 'hero',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#020817","position":0},{"color":"#1e293b","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<p class=''text-sm uppercase tracking-[0.3em] text-blue-400 font-bold text-center md:text-left mb-4''>The Nextblock Journal</p>"}},{"block_type":"text","content":{"html_content":"<h2 class=''text-4xl md:text-5xl font-bold text-white text-center md:text-left mb-6''>Deep dives into performance, DX, and visual editing.</h2>"}},{"block_type":"text","content":{"html_content":"<p class=''text-slate-300 text-lg max-w-xl mx-auto md:mx-0 text-center md:text-left leading-relaxed''>Explore architectural walkthroughs, Supabase recipes, and block editor experiments written by the Nextblock core team.</p>"}},{"block_type":"button","content":{"text":"Explore Articles","url":"/articles#latest","variant":"default","size":"lg"}},{"block_type":"button","content":{"text":"Subscribe for Updates","url":"https://github.com/nextblock-cms/nextblock/discussions","variant":"outline","size":"lg"}}],[{"block_type":"text","content":{"html_content":"<div class=''h-full flex items-center justify-center rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl p-4 backdrop-blur-sm''><img src=''/images/developer.webp'' alt=''Developer working with the Nextblock stack'' class=''w-full object-cover rounded-2xl shadow-lg'' style=''max-width: 400px;'' /></div>"}}]]}'::jsonb, 0),

  (v_blog_page_id, v_en_lang_id, 'posts_grid',
  '{"postsPerPage":6,"columns":3,"showPagination":true,"title":"Latest Deep Dives"}'::jsonb, 1);

  DELETE FROM public.navigation_items WHERE menu_key = 'HEADER' AND language_id = v_en_lang_id;

  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order", page_id) VALUES
    (v_en_lang_id, 'HEADER', 'Home', '/', 0, v_home_page_id),
    (v_en_lang_id, 'HEADER', 'Articles', '/articles', 1, v_blog_page_id),
    (v_en_lang_id, 'HEADER', 'Contact', '/contact', 3, v_contact_page_id);

  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order") VALUES
  (v_contact_page_id, v_en_lang_id, 'hero', '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#020817","position":0},{"color":"#0f172a","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"heading","content":{"level":1,"text_content":"Let''s Build the Future Together","textAlign":"center","textColor":"white"}},{"block_type":"text","content":{"html_content":"<p class=''text-xl text-slate-300 text-center max-w-3xl mx-auto mt-4''>NextBlock™ is an open-source project driven by community feedback. We''d love to hear your thoughts, ideas, or questions.</p>"}}]]}'::jsonb, 0),
  (v_contact_page_id, v_en_lang_id, 'section', '{"container_type":"container","background":{"type":"none"},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"padding":{"top":"lg","bottom":"lg"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<div class=''max-w-2xl mx-auto text-center''><h2 class=''text-2xl font-bold mb-4''>Open Source & Community Driven</h2><p class=''text-slate-600 dark:text-slate-400 mb-6''>NextBlock™ is built in the open. We rely on developers and editors like you to help us define the roadmap. Whether it''s a bug report, a feature request, or just a shoutout, every message helps us move faster.</p></div>"}}]]}'::jsonb, 1),
  (v_contact_page_id, v_en_lang_id, 'form', '{"recipient_email":"foo@bar.com","submit_button_text":"Send Message","success_message":"Thank you for your feedback! We''ll get back to you soon.","fields":[{"temp_id":"name","label":"Name","field_type":"text","is_required":true,"placeholder":"Your name"},{"temp_id":"email","label":"Email","field_type":"email","is_required":true,"placeholder":"your@email.com"},{"temp_id":"message","label":"Message","field_type":"textarea","is_required":true,"placeholder":"How can we help?"}]}'::jsonb, 2);
END;
$seed$;
SELECT id AS home_page_id
FROM public.pages
WHERE slug = 'home'
  AND language_id = (SELECT id FROM public.languages WHERE code = 'en' LIMIT 1)
ORDER BY created_at DESC
LIMIT 1;

SELECT id AS blog_page_id
FROM public.pages
WHERE slug = 'articles'
  AND language_id = (SELECT id FROM public.languages WHERE code = 'en' LIMIT 1)
ORDER BY created_at DESC
LIMIT 1;
-- French Home + Blog blocks
DO $seed_fr$
DECLARE
  v_fr_lang_id BIGINT;
  v_home_page_fr_id BIGINT;
  v_blog_page_fr_id BIGINT;
  v_contact_page_fr_id BIGINT;
BEGIN
  SELECT id INTO v_fr_lang_id FROM public.languages WHERE code = 'fr' LIMIT 1;
  IF v_fr_lang_id IS NULL THEN RAISE EXCEPTION 'French language not found.'; END IF;

  SELECT id INTO v_home_page_fr_id FROM public.pages WHERE slug = 'accueil' AND language_id = v_fr_lang_id ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_blog_page_fr_id FROM public.pages WHERE slug = 'articles' AND language_id = v_fr_lang_id ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_contact_page_fr_id FROM public.pages WHERE slug = 'contact' AND language_id = v_fr_lang_id ORDER BY created_at DESC LIMIT 1;

  IF v_home_page_fr_id IS NULL THEN RAISE EXCEPTION 'French home page not found.'; END IF;
  IF v_blog_page_fr_id IS NULL THEN RAISE EXCEPTION 'French articles page not found.'; END IF;
  IF v_contact_page_fr_id IS NULL THEN RAISE EXCEPTION 'French contact page not found.'; END IF;

  DELETE FROM public.blocks WHERE page_id IN (v_home_page_fr_id, v_blog_page_fr_id, v_contact_page_fr_id);

  DELETE FROM public.navigation_items WHERE menu_key = 'HEADER' AND language_id = v_fr_lang_id;

  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order", page_id) VALUES
    (v_fr_lang_id, 'HEADER', 'Accueil', '/accueil', 0, v_home_page_fr_id),
    (v_fr_lang_id, 'HEADER', 'Articles', '/articles', 1, v_blog_page_fr_id),
    (v_fr_lang_id, 'HEADER', 'Contact', '/contact', 3, v_contact_page_fr_id);

  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order") VALUES
  (v_contact_page_fr_id, v_fr_lang_id, 'hero', '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#020817","position":0},{"color":"#0f172a","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"heading","content":{"level":1,"text_content":"Bâtissons le futur ensemble","textAlign":"center","textColor":"white"}},{"block_type":"text","content":{"html_content":"<p class=''text-xl text-slate-300 text-center max-w-3xl mx-auto mt-4''>NextBlock™ est un projet open-source propulsé par vos retours. Nous serions ravis d''entendre vos idées ou vos questions.</p>"}}]]}'::jsonb, 0),
  (v_contact_page_fr_id, v_fr_lang_id, 'section', '{"container_type":"container","background":{"type":"none"},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"padding":{"top":"lg","bottom":"lg"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<div class=''max-w-2xl mx-auto text-center''><h2 class=''text-2xl font-bold mb-4''>Open Source & Communautaire</h2><p class=''text-slate-600 dark:text-slate-400 mb-6''>NextBlock™ est construit en public. Nous comptons sur les développeurs et éditeurs comme vous pour définir notre roadmap. Qu''il s''agisse d''un bug, d''une suggestion ou d''un simple salut, chaque message compte.</p></div>"}}]]}'::jsonb, 1),
  (v_contact_page_fr_id, v_fr_lang_id, 'form', '{"recipient_email":"foo@bar.com","submit_button_text":"Envoyer le message","success_message":"Merci pour vos retours ! Nous vous répondrons bientôt.","fields":[{"temp_id":"nom","label":"Nom","field_type":"text","is_required":true,"placeholder":"Votre nom"},{"temp_id":"email","label":"Email","field_type":"email","is_required":true,"placeholder":"votre@email.com"},{"temp_id":"message","label":"Message","field_type":"textarea","is_required":true,"placeholder":"Comment pouvons-nous vous aider ?"}]}'::jsonb, 2);

  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order") VALUES
  (v_home_page_fr_id, v_fr_lang_id, 'hero',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#020817","position":0},{"color":"#0f172a","position":50},{"color":"#1e293b","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"xl","vertical_alignment":"center","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<h1 class=''text-5xl md:text-6xl font-bold tracking-tight text-white text-center drop-shadow-lg''>Créez des sites <span class=''relative inline-block mx-1 group''><span class=''absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 translate-y-1 md:translate-y-2 transform -skew-x-12 rounded-sm shadow-lg group-hover:skew-x-0 transition-transform duration-300 ease-out''></span><span class=''relative text-white italic px-1''>Ultra-Rapides</span></span><br class=''md:hidden'' />.</h1>"}},{"block_type":"text","content":{"html_content":"<p class=''text-xl text-slate-300 text-center max-w-3xl mx-auto mt-4 leading-relaxed''>NextBlock™ est le CMS Next.js open-source alliant scores Lighthouse parfaits et éditeur visuel puissant.</p>"}},{"block_type":"button","content":{"text":"Commencer","url":"/article/comment-configurer-nextblock","variant":"default","size":"lg","position":"center"}},{"block_type":"button","content":{"text":"Voir sur GitHub","url":"https://github.com/nextblock-cms/nextblock","variant":"outline","size":"lg","position":"center"}},{"block_type":"text","content":{"html_content":"<div class=''flex flex-wrap justify-center gap-6 text-sm uppercase tracking-wide text-slate-400 mt-8''><a href=''https://github.com/nextblock-cms'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>GitHub</a><a href=''https://x.com/NextBlockCMS'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>X</a><a href=''https://www.linkedin.com/in/nextblock/'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>LinkedIn</a><a href=''https://dev.to/nextblockcms'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>Dev.to</a><a href=''https://www.npmjs.com/~nextblockcms'' target=''_blank'' rel=''noopener noreferrer'' class=''hover:text-white transition-colors''>npm</a></div>"}}],[{"block_type":"text","content":{"html_content":"<div class=''p-10 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group''><div class=''absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500''></div><div class=''relative z-10''><p class=''text-xs text-white uppercase tracking-widest font-semibold mb-2''>Pourquoi migrer</p><p class=''text-3xl font-bold text-white mb-2''>100% Lighthouse</p><p class=''text-base text-slate-300 mb-6''>Sites marketing et docs rendus à l''edge avec des performances irréprochables.</p><ul class=''space-y-3 text-sm text-slate-200''><li><span class=''text-blue-400 mr-2''>&#10003;</span> Next.js 16 avec ISR et cache edge</li><li><span class=''text-blue-400 mr-2''>&#10003;</span> Supabase pour l''auth, les données et le stockage</li><li><span class=''text-blue-400 mr-2''>&#10003;</span> Éditeur de blocs type Notion sur Tiptap</li></ul><div class=''mt-6 rounded-2xl overflow-hidden border border-white/10 shadow-lg''><img src=''/images/NBcover.webp'' alt=''Couverture Nextblock'' class=''w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700'' fetchpriority=''high'' /></div></div></div>"}}]]}'::jsonb, 0),

  (v_home_page_fr_id, v_fr_lang_id, 'section',
  '{"container_type":"container","background":{"type":"none"},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"heading","content":{"level":2,"text_content":"Fonctionnalités clés : les trois piliers de NextBlock™","textAlign":"center"}},{"block_type":"text","content":{"html_content":"<p class=''text-lg text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto''>NextBlock™ unifie performances, expérience éditoriale et contrôle développeur pour que chaque équipe livre son meilleur travail.</p>"}},{"block_type":"text","content":{"html_content":"<div class=''grid gap-8 md:grid-cols-3 mt-12''><div class=''p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300''><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>Vitesse Extrême.</h3><p class=''text-sm text-slate-600 dark:text-slate-400 leading-relaxed''>Pensé pour des scores Lighthouse parfaits avec une diffusion mondiale.</p><ul class=''mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400''><li><strong class=''text-slate-800 dark:text-slate-200''>Edge Caching:</strong> Servez vos pages partout.</li><li><strong class=''text-slate-800 dark:text-slate-200''>Critical CSS:</strong> Styles en ligne pour éviter les blocages.</li><li><strong class=''text-slate-800 dark:text-slate-200''>Images Opt:</strong> AVIF et placeholders floutés.</li></ul></div><div class=''p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300''><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>Expérience Éditeur.</h3><p class=''text-sm text-slate-600 dark:text-slate-400 leading-relaxed''>Un éditeur façon Notion pour publier sans dépendre des développeurs.</p><ul class=''mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400''><li><strong class=''text-slate-800 dark:text-slate-200''>Visuel:</strong> Héros, galeries, témoignages.</li><li><strong class=''text-slate-800 dark:text-slate-200''>Média:</strong> Dossiers, tags et actions groupées.</li><li><strong class=''text-slate-800 dark:text-slate-200''>Historique:</strong> Restauration complète.</li></ul></div><div class=''p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300''><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>Extensible à l''Infini.</h3><p class=''text-sm text-slate-700 dark:text-slate-200 leading-relaxed''>Un socle Next.js + Supabase modulaire, extensible et auto-hébergeable.</p><ul class=''mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200''><li><strong class=''text-slate-900 dark:text-white''>SDK de blocs:</strong> Composants typés.</li><li><strong class=''text-slate-900 dark:text-white''>CLI:</strong> Générez modules en minutes.</li><li><strong class=''text-slate-900 dark:text-white''>Monorepo Nx:</strong> Dépendances maintenables.</li></ul></div></div>"}}]]}'::jsonb, 1),

  (v_home_page_fr_id, v_fr_lang_id, 'section',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"180deg","stops":[{"color":"#0f172a","position":0},{"color":"#020817","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<h2 class=''text-3xl md:text-4xl font-bold text-white text-center mb-6''>Conçu avec les meilleurs outils.</h2>"}},{"block_type":"text","content":{"html_content":"<p class=''text-slate-400 text-center max-w-2xl mx-auto''>Chaque couche de NextBlock™ repose sur des technologies éprouvées pour une expérience familière et performante.</p><div class=''grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-10 text-sm font-semibold text-center text-white''><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Next.js</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>React</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Supabase</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Stripe</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Tailwind</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Tiptap</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Vercel</div><div class=''p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors''>Nx</div></div>"}},{"block_type":"text","content":{"html_content":"<h2 class=''text-3xl md:text-4xl font-bold text-white text-center mb-6 mt-16''>Puissant pour les développeurs. Intuitif pour les éditeurs.</h2>"}},{"block_type":"text","content":{"html_content":"<div class=''grid md:grid-cols-2 gap-8 mt-10 text-white''><div class=''p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm''><h3 class=''text-xl font-bold mb-6 text-blue-400''>Pour les créateurs</h3><ul class=''space-y-4 text-sm text-slate-300''><li><strong class=''text-white block mb-1''>Éditeur de blocs</strong>Glisser-déposer façon Notion.</li><li><strong class=''text-white block mb-1''>Blocs riches</strong>Héros, galeries, témoignages.</li><li><strong class=''text-white block mb-1''>Médiathèque</strong>Dossiers, tags et actions groupées.</li><li><strong class=''text-white block mb-1''>Versions sécurisées</strong>Historique et restauration instantanée.</li></ul></div><div class=''p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm''><h3 class=''text-xl font-bold mb-6 text-purple-400''>Pour les développeurs</h3><ul class=''space-y-4 text-sm text-slate-300''><li><strong class=''text-white block mb-1''>Next.js 16</strong>Server Components, ISR et Edge prêts à l''emploi.</li><li><strong class=''text-white block mb-1''>Supabase</strong>Postgres, auth, stockage, temps réel.</li><li><strong class=''text-white block mb-1''>Monorepo Nx</strong>Dépendances lisibles et centrales.</li><li><strong class=''text-white block mb-1''>SDK de blocs</strong>Widgets typés et extensibles.</li></ul></div></div>"}}]]}'::jsonb, 2),
  (v_home_page_fr_id, v_fr_lang_id, 'section',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#022c22","position":0},{"color":"#0f172a","position":50},{"color":"#020817","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"xl","vertical_alignment":"center","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<p class=''text-xs uppercase tracking-[0.25em] text-emerald-400 font-bold mb-4''>Disponible — Module Premium</p><h2 class=''text-4xl md:text-5xl font-bold text-white mb-6 leading-tight''>Transformez votre CMS<br/>en vitrine complète.</h2><p class=''text-lg text-slate-300 max-w-2xl leading-relaxed mb-8''>NextBlock™ Commerce transforme votre plateforme de contenu en moteur e-commerce complet. Produits, checkout, multi-devises, taxes, expédition, factures — le tout intégré nativement dans l''éditeur de blocs que vous connaissez déjà.</p>"}},{"block_type":"button","content":{"text":"Découvrir Commerce →","url":"/article/guide-commerce-nextblock","variant":"default","size":"lg"}},{"block_type":"button","content":{"text":"Obtenir une licence","url":"https://nextblock.dev/product/nextblock-commerce-pro-commerce-license","variant":"outline","size":"lg"}}],[{"block_type":"text","content":{"html_content":"<div class=''rounded-3xl overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-white/5 to-emerald-500/5 shadow-2xl p-6 backdrop-blur-sm''><img src=''/images/commerce-square.webp'' alt=''Tableau de bord NextBlock™ Commerce'' class=''w-full h-auto rounded-2xl shadow-lg'' /><div class=''mt-4 grid grid-cols-3 gap-3 text-center''><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-emerald-400''>∞</p><p class=''text-xs text-slate-400''>Devises</p></div><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-emerald-400''>2</p><p class=''text-xs text-slate-400''>Fournisseurs</p></div><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-emerald-400''>Auto</p><p class=''text-xs text-slate-400''>Taxes</p></div></div></div>"}}]]}'::jsonb, 3),

  (v_home_page_fr_id, v_fr_lang_id, 'section',
  '{"container_type":"container","background":{"type":"none"},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"heading","content":{"level":2,"text_content":"Tout pour vendre en ligne","textAlign":"center"}},{"block_type":"text","content":{"html_content":"<p class=''text-lg text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto mb-12''>NextBlock™ Commerce livre une boîte à outils e-commerce complète pour aller du catalogue au paiement sans plugins tiers.</p><div class=''grid gap-6 md:grid-cols-2 lg:grid-cols-3''><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Multi-Devises</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Taux de change en temps réel, modes d''arrondi, prix charme et synchronisation automatique sur toutes les devises.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Taxes Automatiques</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Taux manuels empilés (TPS + TVQ) ou calcul automatique via Stripe Tax — à vous de choisir.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Zones d''Expédition</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Résolution par pays et état, tarification par devise et seuils de livraison gratuite.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Stripe &amp; Freemius</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Stripe pour les produits physiques, Freemius pour les licences numériques — checkout intelligent avec validation d''inventaire.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Suivi d''Inventaire</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Déduction automatique des quantités au paiement avec gestion des stocks par variante.</p></div><div class=''p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/30 transition-colors duration-300''><h3 class=''text-lg font-bold text-slate-900 dark:text-white mb-2''>Commandes &amp; Factures</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Gestion du cycle de vie des commandes, numérotation stable des factures et rapports de commandes exportables.</p></div></div>"}}]]}'::jsonb, 4),

  (v_home_page_fr_id, v_fr_lang_id, 'section',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#1e1b4b","position":0},{"color":"#0f172a","position":50},{"color":"#020817","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"xl","vertical_alignment":"center","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<div class=''rounded-3xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-white/5 to-violet-500/5 shadow-2xl p-6 backdrop-blur-sm''><img src=''/images/cortex-ai-square.webp'' alt=''Tableau de bord NextBlock™ Cortex AI montrant le générateur de blocs'' class=''w-full h-auto rounded-2xl shadow-lg'' /><div class=''mt-4 grid grid-cols-3 gap-3 text-center''><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-violet-400''>OpenRouter</p><p class=''text-xs text-slate-400''>Passerelle IA</p></div><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-violet-400''>BYOK</p><p class=''text-xs text-slate-400''>Contrôle des coûts</p></div><div class=''p-3 rounded-xl bg-white/5 border border-white/10''><p class=''text-lg font-bold text-violet-400''>Zod</p><p class=''text-xs text-slate-400''>Blocs typés</p></div></div></div>"}}],[{"block_type":"text","content":{"html_content":"<p class=''text-xs uppercase tracking-[0.25em] text-violet-400 font-bold mb-4''>Disponible — Copilote IA</p><h2 class=''text-4xl md:text-5xl font-bold text-white mb-6 leading-tight''>Boostez votre<br/>contenu avec l''IA.</h2><p class=''text-lg text-slate-300 max-w-2xl leading-relaxed mb-8''>NextBlock™ Cortex AI apporte une intelligence native au niveau des blocs directement dans votre éditeur. Générez du texte, restructurez vos contenus et automatisez les traductions en un clic, le tout propulsé par notre architecture haute performance.</p>"}},{"block_type":"button","content":{"text":"Découvrir l''IA →","url":"/article/nextblock-cortex-ai-guide","variant":"default","size":"lg"}},{"block_type":"button","content":{"text":"Obtenir une licence","url":"https://nextblock.dev/product/nextblock-cortex-ai-cortex-ai-license","variant":"outline","size":"lg"}}]]}'::jsonb, 5),

  (v_home_page_fr_id, v_fr_lang_id, 'section',
  '{"container_type":"container","background":{"type":"none"},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"heading","content":{"level":2,"text_content":"Plus qu''un CMS. Un écosystème.","textAlign":"center"}},{"block_type":"text","content":{"html_content":"<p class=''text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto''>NextBlock™ construit une feuille de route open-core durable qui évolue avec votre activité.</p>"}},{"block_type":"text","content":{"html_content":"<div class=''grid gap-6 lg:grid-cols-[0.75fr_1.25fr] mt-10 items-stretch''><div class=''overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-950 shadow-2xl''><img src=''/images/goals.webp'' alt=''Tableau de roadmap montrant la direction de l''ecosysteme NextBlock™ et des modules premium'' class=''h-full w-full object-cover'' /><div class=''border-t border-white/10 bg-slate-950/95 px-6 py-5''><p class=''text-xs uppercase tracking-[0.24em] text-emerald-300 mb-2 font-bold''>Roadmap en mouvement</p><p class=''text-sm text-slate-300 mb-0''>Le commerce arrive en premier, puis l''ecosysteme s''etend avec des plugins, des blocs et des modules construits par les partenaires.</p></div></div><div class=''grid gap-6''><div class=''p-10 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/5 dark:to-white/5 hover:border-emerald-500/40 transition-colors''><p class=''text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2 font-bold''>Disponible maintenant</p><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>NextBlock™ Commerce</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Transformez votre site en vitrine composable avec produits, checkout, tarification multi-devise, taxes automatiques et blocs commerce relies a votre contenu editorial.</p></div><div class=''p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-violet-500/30 transition-colors''><p class=''text-xs uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-2 font-bold''>Construire la suite</p><h3 class=''text-xl font-bold text-slate-900 dark:text-white mb-3''>Marketplace de plugins et blocs</h3><p class=''text-sm text-slate-600 dark:text-slate-400''>Une marketplace communautaire ouvrira la voie a la publication, la vente et la distribution de blocs, themes, integrations et modules partenaires.</p></div></div></div>"}},{"block_type":"heading","content":{"level":2,"text_content":"Rejoignez la communauté.","textAlign":"center"}},{"block_type":"text","content":{"html_content":"<p class=''text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto''>NextBlock™ se construit en public. Ajoutez une étoile, partagez vos retours et façonnez l''avenir du CMS orienté performance.</p>"}},{"block_type":"text","content":{"html_content":"<div class=''grid gap-4 md:grid-cols-3 mt-10 text-sm''><a class=''p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]'' href=''https://github.com/nextblock-cms'' target=''_blank'' rel=''noopener noreferrer''><strong class=''block text-base text-slate-900 dark:text-white mb-1''>GitHub</strong><span class=''text-slate-600 dark:text-slate-400''>Ajoutez une étoile &amp; contribuez</span></a><a class=''p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]'' href=''https://x.com/NextBlockCMS'' target=''_blank'' rel=''noopener noreferrer''><strong class=''block text-base text-slate-900 dark:text-white mb-1''>X (Twitter)</strong><span class=''text-slate-600 dark:text-slate-400''>Suivez les annonces</span></a><a class=''p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]'' href=''https://dev.to/nextblockcms'' target=''_blank'' rel=''noopener noreferrer''><strong class=''block text-base text-slate-900 dark:text-white mb-1''>Dev.to</strong><span class=''text-slate-600 dark:text-slate-400''>Lisez nos articles techniques</span></a></div>"}}]]}'::jsonb, 6),

  (v_home_page_fr_id, v_fr_lang_id, 'section',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"180deg","stops":[{"color":"#020817","position":0},{"color":"#0f172a","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":1},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<h2 class=''text-3xl md:text-4xl font-bold text-center text-white mb-4''>Des questions ?</h2>"}},{"block_type":"text","content":{"html_content":"<p class=''text-center text-base text-slate-300 max-w-2xl mx-auto''>NextBlock™ co-construit avec des partenaires : fonctionnalités, modules sponsorisés et direction produit.</p>"}},{"block_type":"button","content":{"text":"Nous contacter","url":"mailto:info@nextblock.dev","variant":"default","size":"lg","position":"center"}}]]}'::jsonb, 7),

  (v_blog_page_fr_id, v_fr_lang_id, 'hero',
  '{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#020817","position":0},{"color":"#1e293b","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"lg","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<p class=''text-sm uppercase tracking-[0.3em] text-blue-400 font-bold text-center md:text-left mb-4''>Le journal Nextblock</p>"}},{"block_type":"text","content":{"html_content":"<h2 class=''text-4xl md:text-5xl font-bold text-white text-center md:text-left mb-6''>Plongées dans la performance, l''expérience dev et l''édition visuelle.</h2>"}},{"block_type":"text","content":{"html_content":"<p class=''text-lg max-w-xl mx-auto md:mx-0 text-center md:text-left text-slate-300 leading-relaxed''>Walkthroughs d''architecture, recettes Supabase et expérimentations éditeur écrits par l''équipe Nextblock.</p>"}},{"block_type":"button","content":{"text":"Explorer les articles","url":"/articles#latest","variant":"default","size":"lg"}},{"block_type":"button","content":{"text":"S''abonner aux mises à jour","url":"https://github.com/nextblock-cms/nextblock/discussions","variant":"outline","size":"lg"}}],[{"block_type":"text","content":{"html_content":"<div class=''rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl p-4 backdrop-blur-sm''><img src=''/images/developer.webp'' alt=''Développeur travaillant avec la stack Nextblock'' class=''w-full object-cover rounded-2xl shadow-lg'' style=''max-width: 400px;'' /></div>"}}]]}'::jsonb, 0),

  (v_blog_page_fr_id, v_fr_lang_id, 'posts_grid',
  '{"postsPerPage":6,"columns":3,"showPagination":true,"title":"Derniers articles"}'::jsonb, 1);
END;
$seed_fr$;

-- Convert seeded 'hero' block types to 'section' with is_hero = true
UPDATE public.blocks
SET
  block_type = 'section',
  content = COALESCE(content, '{}'::jsonb) || '{"is_hero": true}'::jsonb
WHERE block_type = 'hero';

-- Post content blocks for all 3 posts (EN + FR)
WITH target_posts AS (
  SELECT id, language_id, slug
  FROM public.posts
  WHERE slug IN ('how-nextblock-works', 'comment-nextblock-fonctionne', 'how-to-setup-nextblock', 'comment-configurer-nextblock', 'nextblock-commerce-guide', 'guide-commerce-nextblock')
),
purged AS (
  DELETE FROM public.blocks
  WHERE post_id IN (SELECT id FROM target_posts)
)
INSERT INTO public.blocks (post_id, language_id, block_type, content, "order")

-- Post 1 EN: How NextBlock™ Works
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>NextBlock™ is designed so the hosted CMS, the open-source starter, and the developer tooling all feel like the same product. The shared Nx workspace, typed block contracts, and reusable editor package keep product polish and developer velocity moving together.</p>

<div class='grid gap-4 md:grid-cols-3 my-10'>
  <div class='rounded-3xl border border-sky-200/70 bg-sky-50/70 p-6 dark:border-sky-500/20 dark:bg-sky-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200'>One codebase</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Shared foundation</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Marketing pages, CMS screens, and the starter template evolve together instead of drifting apart.</p>
  </div>
  <div class='rounded-3xl border border-indigo-200/70 bg-indigo-50/70 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-200'>Typed content</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Blocks with guardrails</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Zod schemas, defaults, and renderer contracts make every custom block safer to ship.</p>
  </div>
  <div class='rounded-3xl border border-emerald-200/70 bg-emerald-50/70 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Editorial UX</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Product-grade editing</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>The Tiptap layer gives editors a richer surface without hiding the underlying HTML power.</p>
  </div>
</div>

<div class='flex flex-col md:flex-row gap-8 items-start my-12'>
  <div class='w-full md:w-3/5 space-y-4'>
    <h2>Monorepo Layout and Dependency Flow</h2>
    <p>The <code>apps/nextblock</code> directory contains the production Next.js experience, including the public site and authenticated CMS shell. The <code>apps/create-nextblock</code> CLI mirrors that foundation so teams can start from the same product decisions instead of rebuilding them from scratch.</p>
    <ul class='list-disc pl-6 space-y-2 text-sm'>
      <li><strong>@nextblock-cms/ui</strong> - UI components, tokens, and shared design primitives</li>
      <li><strong>@nextblock-cms/utils</strong> - translations, environment guards, and storage helpers</li>
      <li><strong>@nextblock-cms/db</strong> - migrations, typed database access, and generated types</li>
      <li><strong>@nextblock-cms/editor</strong> - the reusable Tiptap v3 editing surface</li>
      <li><strong>@nextblock-cms/sdk</strong> - typed contracts for block authorship and validation</li>
      <li><strong>@nextblock-cms/ecommerce</strong> - the premium commerce module when activated</li>
    </ul>
    <p>Run <code>nx graph</code> and you can see exactly how changes ripple through the workspace. Path aliases from <code>tsconfig.base.json</code> and the shared Tailwind setup help keep design parity between marketing pages, admin screens, and generated projects.</p>
  </div>
  <aside class='w-full md:w-2/5 rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-white/5'>
    <img src='/images/nx-graph.webp' alt='Nx project graph preview showing apps and shared libraries linked together' class='w-full h-auto rounded-2xl object-cover' />
    <p class='mt-3 text-sm text-slate-500 dark:text-slate-400'>Nx makes every workspace relationship visible, which is exactly why the starter, CMS, and packages stay aligned.</p>
  </aside>
</div>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/extensibility.webp' alt='NextBlock™ extensibility artwork showing the CMS connected to reusable modules and integrations' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>A single visual system spans content modeling, editing, and future premium modules like commerce.</figcaption>
</figure>

<h2>Block Registry as Product Surface</h2>
<p>The block registry in <code>apps/nextblock/lib/blocks/blockRegistry.ts</code> is the source of truth for available block types, Zod schemas, starter content, and editor or renderer components. Today that includes everything from <code>text</code> and <code>heading</code> to <code>section</code>, <code>posts_grid</code>, <code>checkout</code>, and <code>product_details</code>.</p>
<p>Sections support nested column arrays, so layouts can be composed like real pages instead of flat content lists. Helpers such as <code>getBlockDefinition()</code>, <code>getInitialContent()</code>, and <code>validateBlockContent()</code> keep that flexibility strongly typed.</p>

<h2>The Editing Layer</h2>
<p>The <code>@nextblock-cms/editor</code> package wraps Tiptap v3 into a reusable editorial surface with slash commands, floating and bubble menus, drag handles, tables, task lists, character counts, and syntax-highlighted code blocks. It deliberately preserves richer HTML so advanced teams are not boxed into a simplified subset.</p>

<h2>Inside the CMS Shell</h2>
<p>Within <code>apps/nextblock/app/cms</code>, each feature area follows a repeatable pattern: list pages, create and edit routes, scoped client components, and server actions that wrap Supabase mutations. The result feels consistent for editors while keeping credentials and permissions on the server side.</p>

<h2>Open Core Without Product Drift</h2>
<p>The core CMS is open source under AGPL. Premium modules like <code>@nextblock-cms/ecommerce</code> remain source-available but are activated through <code>package_activations</code> and <code>verifyPackageOnline()</code>. That means the same shell can stay clean for open-source users while revealing commerce surfaces only when the license is active.</p>

<h2>Why It Holds Together</h2>
<p>The Nx workspace keeps libraries honest, the Next.js app enforces UI consistency, Supabase migrations codify access rules, and the Tiptap editor gives collaborators the same authoring experience regardless of deployment. When a team runs <code>npm create nextblock</code>, they inherit the full operating model, not just a pile of files.</p>$$
), 0 FROM target_posts tp WHERE tp.slug = 'how-nextblock-works'

UNION ALL

-- Post 1 FR: Comment NextBlock™ fonctionne
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>NextBlock™ relie le CMS h&eacute;berg&eacute;, le starter open source et les outils dev dans un m&ecirc;me socle produit. Le workspace Nx, les contrats de blocs typ&eacute;s et l'&eacute;diteur partag&eacute; permettent d'avancer vite sans sacrifier la coh&eacute;rence.</p>

<div class='grid gap-4 md:grid-cols-3 my-10'>
  <div class='rounded-3xl border border-sky-200/70 bg-sky-50/70 p-6 dark:border-sky-500/20 dark:bg-sky-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200'>Socle unique</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Une m&ecirc;me base</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Le site public, le shell CMS et le starter gardent les m&ecirc;mes choix produit et la m&ecirc;me direction visuelle.</p>
  </div>
  <div class='rounded-3xl border border-indigo-200/70 bg-indigo-50/70 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-200'>Contenu typ&eacute;</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Blocs avec garde-fous</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Sch&eacute;mas Zod, contenus par d&eacute;faut et contrats de rendu rendent les extensions plus s&ucirc;res &agrave; maintenir.</p>
  </div>
  <div class='rounded-3xl border border-emerald-200/70 bg-emerald-50/70 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Exp&eacute;rience &eacute;ditoriale</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Edition premium</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>La couche Tiptap donne aux &eacute;diteurs une interface riche sans masquer la puissance HTML pour les cas avanc&eacute;s.</p>
  </div>
</div>

<div class='flex flex-col md:flex-row gap-8 items-start my-12'>
  <div class='w-full md:w-3/5 space-y-4'>
    <h2>Architecture monorepo et flux de d&eacute;pendances</h2>
    <p>Le dossier <code>apps/nextblock</code> contient l'exp&eacute;rience Next.js en production, incluant le site public et le shell CMS authentifi&eacute;. Le CLI <code>apps/create-nextblock</code> reprend cette base pour que les nouveaux projets partent des m&ecirc;mes d&eacute;cisions produit.</p>
    <ul class='list-disc pl-6 space-y-2 text-sm'>
      <li><strong>@nextblock-cms/ui</strong> - composants UI, tokens et primitives visuelles partag&eacute;es</li>
      <li><strong>@nextblock-cms/utils</strong> - traductions, gardes d'environnement et helpers de stockage</li>
      <li><strong>@nextblock-cms/db</strong> - migrations, acc&egrave;s base typ&eacute; et types g&eacute;n&eacute;r&eacute;s</li>
      <li><strong>@nextblock-cms/editor</strong> - la surface d'&eacute;dition Tiptap v3 r&eacute;utilisable</li>
      <li><strong>@nextblock-cms/sdk</strong> - contrats typ&eacute;s pour l'auteuring et la validation des blocs</li>
      <li><strong>@nextblock-cms/ecommerce</strong> - le module commerce premium lorsqu'il est activ&eacute;</li>
    </ul>
    <p>Lancez <code>nx graph</code> et vous voyez imm&eacute;diatement comment un changement se propage. Les alias de <code>tsconfig.base.json</code> et la configuration Tailwind partag&eacute;e aident &agrave; garder une vraie parit&eacute; entre marketing, back-office et projets g&eacute;n&eacute;r&eacute;s.</p>
  </div>
  <aside class='w-full md:w-2/5 rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-white/5'>
    <img src='/images/nx-graph.webp' alt='Apercu du graphe Nx montrant les applications et librairies partagees' class='w-full h-auto rounded-2xl object-cover' />
    <p class='mt-3 text-sm text-slate-500 dark:text-slate-400'>Nx rend visibles les relations du workspace, ce qui aide le starter, le CMS et les packages a rester alignes.</p>
  </aside>
</div>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/extensibility.webp' alt='Visuel NextBlock™ montrant le CMS relie a des modules reutilisables et des integrations' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Un seul langage visuel relie la modelisation de contenu, l'edition et les futurs modules premium comme le commerce.</figcaption>
</figure>

<h2>Le registre de blocs comme surface produit</h2>
<p>Le registre dans <code>apps/nextblock/lib/blocks/blockRegistry.ts</code> d&eacute;finit les types disponibles, les sch&eacute;mas Zod, les contenus de d&eacute;part et les composants d'&eacute;dition ou de rendu. On y trouve aujourd'hui des blocs comme <code>text</code>, <code>heading</code>, <code>section</code>, <code>posts_grid</code>, <code>checkout</code> et <code>product_details</code>.</p>
<p>Les sections supportent des colonnes imbriqu&eacute;es, ce qui permet de composer de vraies pages plut&ocirc;t qu'une simple liste de contenu. Des helpers comme <code>getBlockDefinition()</code>, <code>getInitialContent()</code> and <code>validateBlockContent()</code> gardent cette flexibilit&eacute; bien typ&eacute;e.</p>

<h2>La couche d'edition</h2>
<p>Le package <code>@nextblock-cms/editor</code> enveloppe Tiptap v3 dans une surface &eacute;ditoriale r&eacute;utilisable avec slash commands, menus contextuels, drag handles, tableaux, listes de taches, compteurs et blocs de code. Le but est de conserver un HTML riche quand une equipe en a besoin.</p>

<h2>A l'interieur du shell CMS</h2>
<p>Dans <code>apps/nextblock/app/cms</code>, chaque zone suit un motif lisible : pages de liste, routes de creation et d'edition, composants clients cibles et server actions qui encapsulent les mutations Supabase. Les editeurs y gagnent une interface coherente et les identifiants restent cote serveur.</p>

<h2>Open core sans derive produit</h2>
<p>Le coeur du CMS est open source sous AGPL. Les modules premium comme <code>@nextblock-cms/ecommerce</code> restent disponibles en source mais sont actives via <code>package_activations</code> et <code>verifyPackageOnline()</code>. Le meme shell peut donc rester simple pour l'open source tout en deverrouillant les surfaces commerce au bon moment.</p>

<h2>Pourquoi l'ensemble tient</h2>
<p>Le workspace Nx garde les librairies honnetes, l'app Next.js maintient la coherence UI, les migrations Supabase codifient les regles d'acces, et l'editeur Tiptap donne la meme experience de contribution quel que soit le deploiement. Quand une equipe lance <code>npm create nextblock</code>, elle recupere une facon de travailler complete, pas juste des fichiers.</p>$$
), 0 FROM target_posts tp WHERE tp.slug = 'comment-nextblock-fonctionne'

UNION ALL

-- Post 2 EN: How to Setup NextBlock™
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>There are two strong ways to start with NextBlock: clone the full monorepo if you want the whole platform, or scaffold a standalone app if you want to ship quickly. Both paths land you on the same editorial model, design system, and CMS foundation.</p>

<div class='rounded-[2rem] border border-blue-200 bg-blue-50/80 p-6 my-10 dark:border-blue-500/20 dark:bg-blue-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200'>Choose your path</p>
  <div class='grid gap-6 md:grid-cols-2 mt-5'>
    <div class='rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-500/10 dark:bg-slate-900/40'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>Monorepo</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Best for contributors, plugin authors, and teams that want direct access to every app and shared package.</p>
    </div>
    <div class='rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-500/10 dark:bg-slate-900/40'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>CLI starter</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Best for launching a production-ready Next.js project with NextBlock™ already wired in and easy to deploy.</p>
    </div>
  </div>
</div>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/included.webp' alt='NextBlock™ platform artwork showing the CMS, blocks, and integrations that ship together' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Whichever path you choose, you still inherit the same block editor, CMS shell, and shared product language.</figcaption>
</figure>

<h2>Path 1: Clone the Monorepo</h2>
<p>This route is ideal when you want the full Nx workspace and every internal package available locally.</p>

<div class='grid gap-6 md:grid-cols-2 my-8'>
  <div class='rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>You get</p>
    <ul class='mt-4 list-disc pl-5 space-y-2 text-sm'>
      <li>The public site, CMS app, CLI source, and shared libraries</li>
      <li>Direct access to <code>libs/</code> for custom block and package work</li>
      <li>Workspace tools like <code>nx graph</code> for dependency visibility</li>
    </ul>
  </div>
  <div class='rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>Good fit for</p>
    <ul class='mt-4 list-disc pl-5 space-y-2 text-sm'>
      <li>Core contributors and maintainers</li>
      <li>Teams building custom modules or premium extensions</li>
      <li>Agencies that want end-to-end control over the platform</li>
    </ul>
  </div>
</div>

<pre><code>git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run setup</code></pre>

<p>The <code>npm run setup</code> wizard creates <code>.env.local</code>, asks for your Supabase keys, can wire up R2 and SMTP, links the Supabase CLI, and pushes the schema with <code>npm run db:push</code>.</p>

<p>Then start the app:</p>
<pre><code>npx nx serve nextblock</code></pre>

<p>Useful monorepo commands:</p>
<pre><code># Build every workspace package
npm run all-builds

# Lint the main application
npm run nx:lint:nextblock

# Regenerate database types
npm run db:types

# Inspect workspace relationships
npx nx graph</code></pre>

<h2>Path 2: Use the CLI Starter</h2>
<p>If your goal is to launch quickly, the CLI gives you a standalone Next.js app with NextBlock™ already embedded.</p>

<pre><code>npm create nextblock@latest my-site
cd my-site</code></pre>

<p>The CLI copies a production-ready template, rewrites workspace imports to published packages, and can run the same setup flow for you. Your result is a normal Next.js app with no Nx requirement.</p>

<p>Configure your environment in <code>.env.local</code>:</p>
<pre><code>NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_URL=http://localhost:3000</code></pre>

<p>Push the schema and start developing:</p>
<pre><code>npm run db:push
npm run dev</code></pre>

<div class='rounded-3xl border border-amber-200 bg-amber-50/80 p-6 my-8 dark:border-amber-500/20 dark:bg-amber-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>Tip</p>
  <p class='mb-0 text-sm text-slate-700 dark:text-slate-200'>The CLI path is the fastest way to evaluate NextBlock™ with your own content model before you decide whether you need the full workspace.</p>
</div>

<h2>Activating Premium Modules</h2>
<p>For CLI-generated projects, the commerce package can be activated with a single command:</p>
<pre><code>npx create-nextblock activate ecommerce</code></pre>
<p>This injects wrappers for <code>/cms/orders</code>, <code>/cms/products</code>, <code>/checkout</code>, and the checkout API, all gated through <code>verifyPackageOnline()</code> so premium routes stay aligned with your license.</p>

<h2>Deployment</h2>
<p>NextBlock™ deploys like a standard Next.js app. Push to Vercel, Netlify, or any Node.js host, then make sure your server-side environment variables such as the Supabase service role, Stripe keys, and <code>CRON_SECRET</code> are configured in that environment.</p>$$
), 0 FROM target_posts tp WHERE tp.slug = 'how-to-setup-nextblock'

UNION ALL

-- Post 2 FR: Comment configurer NextBlock™
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>Il existe deux bonnes facons de lancer NextBlock™ : cloner le monorepo complet si vous voulez toute la plateforme, ou partir du CLI si vous voulez aller vite. Dans les deux cas, vous retrouvez le meme modele editorial, le meme shell CMS et la meme base produit.</p>

<div class='rounded-[2rem] border border-blue-200 bg-blue-50/80 p-6 my-10 dark:border-blue-500/20 dark:bg-blue-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200'>Choisissez votre chemin</p>
  <div class='grid gap-6 md:grid-cols-2 mt-5'>
    <div class='rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-500/10 dark:bg-slate-900/40'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>Monorepo</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Ideal pour les contributeurs, auteurs de plugins et equipes qui veulent travailler directement dans tous les packages partages.</p>
    </div>
    <div class='rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-500/10 dark:bg-slate-900/40'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>Starter CLI</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Ideal pour demarrer une app Next.js prete a deployer avec NextBlock™ deja integre.</p>
    </div>
  </div>
</div>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/included.webp' alt='Visuel NextBlock™ montrant le CMS, les blocs et les integrations qui arrivent ensemble' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Quel que soit le chemin choisi, vous heritez du meme editeur de blocs, du meme shell CMS et du meme langage produit.</figcaption>
</figure>

<h2>Chemin 1 : cloner le monorepo</h2>
<p>Cette option est la meilleure si vous voulez tout le workspace Nx et chaque package interne disponible en local.</p>

<div class='grid gap-6 md:grid-cols-2 my-8'>
  <div class='rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>Vous obtenez</p>
    <ul class='mt-4 list-disc pl-5 space-y-2 text-sm'>
      <li>Le site public, l'app CMS, le code du CLI et les librairies partagees</li>
      <li>Un acces direct a <code>libs/</code> pour les blocs et modules personnalises</li>
      <li>Les outils de workspace comme <code>nx graph</code> pour visualiser les dependances</li>
    </ul>
  </div>
  <div class='rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>Bon choix pour</p>
    <ul class='mt-4 list-disc pl-5 space-y-2 text-sm'>
      <li>Les mainteneurs et contributeurs coeur</li>
      <li>Les equipes qui construisent des extensions sur mesure</li>
      <li>Les agences qui veulent un controle complet de la plateforme</li>
    </ul>
  </div>
</div>

<pre><code>git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run setup</code></pre>

<p>L'assistant <code>npm run setup</code> cree <code>.env.local</code>, demande vos cles Supabase, peut brancher R2 et SMTP, lie le CLI Supabase, puis pousse le schema avec <code>npm run db:push</code>.</p>

<p>Puis lancez l'application :</p>
<pre><code>npx nx serve nextblock</code></pre>

<p>Commandes utiles dans le monorepo :</p>
<pre><code># Build de tous les packages
npm run all-builds

# Lint de l'application principale
npm run nx:lint:nextblock

# Regenerer les types base de donnees
npm run db:types

# Inspecter les relations du workspace
npx nx graph</code></pre>

<h2>Chemin 2 : utiliser le starter CLI</h2>
<p>Si votre but est d'aller vite, le CLI vous donne une app Next.js autonome avec NextBlock™ deja integre.</p>

<pre><code>npm create nextblock@latest mon-site
cd mon-site</code></pre>

<p>Le CLI copie un template pret pour la production, remplace les imports workspace par les packages publies, et peut lancer la meme configuration initiale. Le resultat reste une app Next.js classique, sans dependance a Nx.</p>

<p>Configurez votre environnement dans <code>.env.local</code> :</p>
<pre><code>NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_URL=http://localhost:3000</code></pre>

<p>Poussez le schema puis demarrez :</p>
<pre><code>npm run db:push
npm run dev</code></pre>

<div class='rounded-3xl border border-amber-200 bg-amber-50/80 p-6 my-8 dark:border-amber-500/20 dark:bg-amber-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>Conseil</p>
  <p class='mb-0 text-sm text-slate-700 dark:text-slate-200'>Le chemin CLI est le moyen le plus rapide d'evaluer NextBlock™ avec votre propre modele de contenu avant de passer, si besoin, au workspace complet.</p>
</div>

<h2>Activer les modules premium</h2>
<p>Pour un projet genere via le CLI, le package commerce peut etre active avec une seule commande :</p>
<pre><code>npx create-nextblock activate ecommerce</code></pre>
<p>Cette commande injecte les wrappers pour <code>/cms/orders</code>, <code>/cms/products</code>, <code>/checkout</code> et l'API checkout, le tout protege par <code>verifyPackageOnline()</code> afin de garder les routes premium alignees avec la licence.</p>

<h2>Deploiement</h2>
<p>NextBlock™ se deploie comme une app Next.js standard. Publiez sur Vercel, Netlify ou tout hebergeur Node.js, puis configurez les variables serveur comme la cle service role Supabase, les cles Stripe et <code>CRON_SECRET</code>.</p>$$
), 0 FROM target_posts tp WHERE tp.slug = 'comment-configurer-nextblock'

UNION ALL

-- Post 3 EN: NextBlock™ Commerce Guide
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>NextBlock™ Commerce is the first premium module in the ecosystem: a source-available storefront layer that plugs directly into the same editorial system as the CMS. It is built for teams that want content, catalog, and checkout to live inside one product surface instead of three disconnected tools.</p>

<div class='grid gap-4 md:grid-cols-3 my-10'>
  <div class='rounded-3xl border border-emerald-200/70 bg-emerald-50/70 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Commerce core</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Catalog + checkout</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Products, variants, orders, shipping, and invoices all plug into the existing CMS shell.</p>
  </div>
  <div class='rounded-3xl border border-sky-200/70 bg-sky-50/70 p-6 dark:border-sky-500/20 dark:bg-sky-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200'>Global selling</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Multi-currency ready</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Automatic FX sync, rounding strategies, and per-product overrides keep international pricing practical.</p>
  </div>
  <div class='rounded-3xl border border-indigo-200/70 bg-indigo-50/70 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-200'>Operator workflow</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Provider-aware flow</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Stripe and Freemius are handled differently so the storefront can stay clean without hiding complexity.</p>
  </div>
</div>

<h2>Product Catalog</h2>
<p>Commerce supports physical and digital products with variants, attributes, localized product media, independent pricing, SKUs, and stock levels. Product assets stay in the same media library editors already use for marketing pages, so content and commerce teams are not working in separate silos.</p>

<h2>Multi-Currency Engine</h2>
<p>The pricing engine is built for real-world stores, not just a demo checkout:</p>
<ul>
  <li><strong>Unlimited currencies</strong> with ISO codes, symbols, and stored exchange rates</li>
  <li><strong>Automatic FX sync</strong> from Frankfurter or a custom provider via <code>FX_API_BASE_URL</code></li>
  <li><strong>Rounding modes</strong> including nearest, up, down, and charm pricing like <code>9.99</code></li>
  <li><strong>Store-managed auto-sync</strong> so product prices convert when rates refresh</li>
  <li><strong>Rebasing</strong> when the default currency changes</li>
  <li><strong>Per-product overrides</strong> when a catalog item needs explicit pricing in specific markets</li>
</ul>

<h2>Tax Automation</h2>
<p>Teams can stay manual when they need control, or delegate tax math to Stripe Tax when they want automation:</p>
<div class='grid md:grid-cols-2 gap-6 my-6'>
  <div class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'>
    <h4 class='font-bold text-slate-900 dark:text-white mb-2'>Manual mode</h4>
    <p class='text-sm text-slate-600 dark:text-slate-400'>Define rates by country and optional state or province. Stacked taxes such as GST + PST are supported, and tax lines are stored in <code>orders.tax_details</code>.</p>
  </div>
  <div class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'>
    <h4 class='font-bold text-slate-900 dark:text-white mb-2'>Automatic mode</h4>
    <p class='text-sm text-slate-600 dark:text-slate-400'>Stripe Tax calculates the final amounts. Product and shipping tax codes travel with the line items, and the webhook resync replaces provisional values with final totals.</p>
  </div>
</div>

<h2>Shipping and Checkout</h2>
<p>Shipping zones match by country and state or province, support localized method names, per-currency pricing, free-shipping thresholds, and priority-based fallbacks when an exact match is not found.</p>
<p>The checkout layer is provider-aware:</p>
<ul>
  <li><strong>Stripe</strong> handles physical goods, inventory checks, shipping calculation, tax, customer upserts, and Checkout Sessions</li>
  <li><strong>Freemius</strong> handles digital licensing, plan resolution, and checkout URLs with sandbox support</li>
  <li>Mixed-provider carts are rejected so the buyer journey stays understandable</li>
</ul>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/commerce-plan.webp' alt='Commerce roadmap board outlining premium module goals and future storefront capabilities for NextBlock™' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Commerce is positioned as the first premium module in a larger roadmap, which makes it feel like part of a growing platform instead of a bolt-on add-on.</figcaption>
</figure>

<h2>Inventory, Orders, and Invoices</h2>
<p>When quantity tracking is enabled, checkout validates requested quantities against <code>inventory_items</code>. On payment confirmation, <code>apply_order_inventory_deduction()</code> reduces stock with a resilient fallback path that can use direct SQL if the RPC layer fails.</p>
<ul>
  <li>Order statuses move from <code>pending</code> to <code>paid</code> to <code>shipped</code>, with cancellation and refund states available too</li>
  <li>Invoice numbering is generated through database functions for consistency</li>
  <li>Printable invoice documents pull from <code>invoice_settings</code></li>
  <li>Customers can review order history and invoice access from the storefront side</li>
  <li><strong>Coming soon:</strong> exportable order reporting and analytics dashboards</li>
</ul>

<h2>Commerce Surfaces Inside the CMS</h2>
<p>When the ecommerce package is active, the CMS exposes product list, create, and edit views with media and variants, inventory management, order detail screens, shipping configuration, payment provider settings, tax setup, and currency management. The important part is not only that those screens exist, but that they feel native inside the same shell your content team is already using.</p>$$
), 0 FROM target_posts tp WHERE tp.slug = 'nextblock-commerce-guide'

UNION ALL

-- Post 3 FR: Guide Commerce NextBlock™
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>NextBlock™ Commerce est le premier module premium de l'ecosysteme : une couche storefront source-available qui se branche directement sur le meme systeme editorial que le CMS. L'objectif est de rapprocher contenu, catalogue et checkout dans une seule surface produit.</p>

<div class='grid gap-4 md:grid-cols-3 my-10'>
  <div class='rounded-3xl border border-emerald-200/70 bg-emerald-50/70 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Base commerce</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Catalogue + checkout</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Produits, variantes, commandes, livraison et factures vivent dans le meme shell CMS.</p>
  </div>
  <div class='rounded-3xl border border-sky-200/70 bg-sky-50/70 p-6 dark:border-sky-500/20 dark:bg-sky-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200'>Vente globale</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Multi-devise</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Sync FX automatique, strategies d'arrondi et overrides par produit rendent les prix internationaux realistes.</p>
  </div>
  <div class='rounded-3xl border border-indigo-200/70 bg-indigo-50/70 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-200'>Workflow operateur</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Par fournisseur</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Stripe et Freemius sont traites differemment pour garder un parcours d'achat propre sans cacher la complexite.</p>
  </div>
</div>

<h2>Catalogue produits</h2>
<p>Le module gere produits physiques et numeriques avec variantes, attributs, medias localises, prix independants, SKU et niveaux de stock. Les assets produits restent dans la meme bibliotheque media que les pages marketing, ce qui evite de separer equipes contenu et equipes commerce.</p>

<h2>Moteur multi-devise</h2>
<p>Le moteur tarifaire vise un vrai usage boutique, pas seulement une demo :</p>
<ul>
  <li><strong>Devises illimitees</strong> avec codes ISO, symboles et taux stockes</li>
  <li><strong>Synchronisation FX automatique</strong> depuis Frankfurter ou un provider custom via <code>FX_API_BASE_URL</code></li>
  <li><strong>Modes d'arrondi</strong> dont nearest, up, down et prix charme comme <code>9.99</code></li>
  <li><strong>Auto-sync magasin</strong> pour convertir les prix quand les taux changent</li>
  <li><strong>Rebasement</strong> lorsqu'on change la devise par defaut</li>
  <li><strong>Overrides par produit</strong> quand un article demande un prix fixe sur certains marches</li>
</ul>

<h2>Taxes automatiques</h2>
<p>Les equipes peuvent rester en mode manuel ou confier le calcul a Stripe Tax :</p>
<div class='grid md:grid-cols-2 gap-6 my-6'>
  <div class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'>
    <h4 class='font-bold text-slate-900 dark:text-white mb-2'>Mode manuel</h4>
    <p class='text-sm text-slate-600 dark:text-slate-400'>Definition des taux par pays et eventuellement par province. Les taxes empilees comme TPS + TVQ sont supportees, avec stockage dans <code>orders.tax_details</code>.</p>
  </div>
  <div class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'>
    <h4 class='font-bold text-slate-900 dark:text-white mb-2'>Mode automatique</h4>
    <p class='text-sm text-slate-600 dark:text-slate-400'>Stripe Tax calcule les montants finaux. Les codes fiscaux voyagent avec les line items et le webhook remplace les valeurs provisoires par les montants definitifs.</p>
  </div>
</div>

<h2>Livraison et checkout</h2>
<p>Les zones de livraison correspondent par pays et etat ou province, gerent des noms localises, des prix par devise, des seuils de livraison gratuite, et des fallbacks par priorite quand aucune correspondance exacte n'est trouvee.</p>
<p>Le checkout est conscient du fournisseur :</p>
<ul>
  <li><strong>Stripe</strong> gere les biens physiques, les verifications d'inventaire, la livraison, les taxes, les clients et les Checkout Sessions</li>
  <li><strong>Freemius</strong> gere les licences numeriques, la resolution des plans et les URLs de checkout avec support sandbox</li>
  <li>Les paniers melangeant plusieurs fournisseurs sont refuses pour garder un parcours plus clair</li>
</ul>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/commerce-plan.webp' alt='Tableau de roadmap commerce montrant les objectifs premium et les futures capacites storefront de NextBlock™' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Le commerce est presente comme le premier module premium d'une feuille de route plus large, ce qui renforce l'idee d'une vraie plateforme en croissance.</figcaption>
</figure>

<h2>Inventaire, commandes et factures</h2>
<p>Quand le suivi des quantites est actif, le checkout valide les demandes contre <code>inventory_items</code>. A la confirmation du paiement, <code>apply_order_inventory_deduction()</code> retire le stock avec un chemin de repli resilient si la couche RPC echoue.</p>
<ul>
  <li>Les statuts de commande passent de <code>pending</code> a <code>paid</code> puis <code>shipped</code>, avec annulation et remboursement si besoin</li>
  <li>La numerotation des factures est geree par des fonctions SQL pour rester coherente</li>
  <li>Les documents facture tirent leurs informations de <code>invoice_settings</code></li>
  <li>Les clients peuvent consulter leur historique et leurs factures</li>
  <li><strong>Bientot :</strong> exports de commandes et tableaux de bord analytiques</li>
</ul>

<h2>Surfaces commerce dans le CMS</h2>
<p>Quand le package ecommerce est actif, le CMS expose les vues produit, edition avec medias et variantes, gestion d'inventaire, detail des commandes, configuration livraison, parametres de paiement, taxes et devises. L'enjeu principal est que tout cela paraisse natif dans le meme shell que l'equipe contenu utilise deja.</p>$$
), 0 FROM target_posts tp WHERE tp.slug = 'guide-commerce-nextblock';
