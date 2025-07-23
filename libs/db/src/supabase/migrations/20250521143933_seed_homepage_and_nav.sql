-- supabase/migrations/YYYYMMDDHHMMSS_seed_homepage_and_nav.sql
-- Replace YYYYMMDDHHMMSS with the actual timestamp, e.g., 20250521100000

DO $$
DECLARE
  en_lang_id BIGINT;
  fr_lang_id BIGINT;
  admin_user_id UUID;
  home_page_translation_group UUID;
  home_nav_translation_group UUID;
  en_home_page_id BIGINT;
  fr_home_page_id BIGINT;
BEGIN
  -- Get language IDs
  SELECT id INTO en_lang_id FROM public.languages WHERE code = 'en' LIMIT 1;
  SELECT id INTO fr_lang_id FROM public.languages WHERE code = 'fr' LIMIT 1;

  -- Get an admin user ID to set as author (optional, fallback to NULL)
  SELECT id INTO admin_user_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;

  -- Check if languages were found
  IF en_lang_id IS NULL THEN
    RAISE EXCEPTION 'English language (en) not found. Please seed languages first.';
  END IF;
  IF fr_lang_id IS NULL THEN
    RAISE EXCEPTION 'French language (fr) not found. Please seed languages first.';
  END IF;

  -- Generate translation group UUIDs
  home_page_translation_group := gen_random_uuid();
  home_nav_translation_group := gen_random_uuid();

  -- Seed English Homepage
  INSERT INTO public.pages (language_id, author_id, title, slug, status, meta_title, meta_description, translation_group_id)
  VALUES (en_lang_id, admin_user_id, 'Home', 'home', 'published', 'Homepage', 'This is the homepage.', home_page_translation_group)
  RETURNING id INTO en_home_page_id;

  -- Seed French Homepage (Accueil)
  INSERT INTO public.pages (language_id, author_id, title, slug, status, meta_title, meta_description, translation_group_id)
  VALUES (fr_lang_id, admin_user_id, 'Accueil', 'accueil', 'published', 'Page d''accueil', 'Ceci est la page d''accueil.', home_page_translation_group)
  RETURNING id INTO fr_home_page_id;

  -- Seed initial content block for English Homepage (optional)
  IF en_home_page_id IS NOT NULL THEN
    INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
    VALUES (en_home_page_id, en_lang_id, 'text', '{"html_content": "<p>Welcome to the English homepage!</p><p>This content is dynamically managed by the CMS.</p>"}', 0);
  END IF;

  -- Seed initial content block for French Homepage (optional)
  IF fr_home_page_id IS NOT NULL THEN
    INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
    VALUES (fr_home_page_id, fr_lang_id, 'text', '{"html_content": "<p>Bienvenue sur la page d''accueil en français !</p><p>Ce contenu est géré dynamiquement par le CMS.</p>"}', 0);
  END IF;

  -- Seed English Navigation Item for Homepage (linked to the English page, but URL is root)
  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order", page_id, translation_group_id)
  VALUES (en_lang_id, 'HEADER', 'Home', '/', 0, en_home_page_id, home_nav_translation_group);

  -- Seed French Navigation Item for Homepage (linked to the French page, but URL is root)
  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order", page_id, translation_group_id)
  VALUES (fr_lang_id, 'HEADER', 'Accueil', '/', 0, fr_home_page_id, home_nav_translation_group);

  RAISE NOTICE 'Homepage and navigation links seeded for EN and FR.';
END $$;