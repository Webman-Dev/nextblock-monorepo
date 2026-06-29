-- 00000000000031_seed_footer_navigation.sql
-- Seed editable FOOTER navigation items (EN + FR).
--
-- The public footer used to hard-code its "Privacy Policy" and "Terms of Service"
-- links in apps/nextblock/components/AppShell.tsx. This migration turns them into
-- real navigation_items rows under the FOOTER menu so they are editable from the
-- CMS (/cms/navigation) like any other menu, and so the French footer points at
-- the localized page slugs.
--
-- Targets the legal pages seeded by 00000000000027_setup_privacy_and_mfa.sql:
--   EN  /privacy-policy            FR  /politique-de-confidentialite
--   EN  /terms-of-service          FR  /conditions-utilisation
--
-- Idempotent: re-running replaces the FOOTER rows it owns (matched by URL) and
-- reuses their translation_group_id so EN/FR stay linked across re-runs.
DO $seed_footer$
DECLARE
  v_en bigint;
  v_fr bigint;
  v_privacy_group uuid;
  v_terms_group uuid;
  v_en_privacy_page bigint;
  v_fr_privacy_page bigint;
  v_en_terms_page bigint;
  v_fr_terms_page bigint;
BEGIN
  SELECT id INTO v_en FROM public.languages WHERE code = 'en' LIMIT 1;
  SELECT id INTO v_fr FROM public.languages WHERE code = 'fr' LIMIT 1;

  IF v_en IS NULL THEN
    RAISE NOTICE 'Default language "en" not found; skipping footer navigation seed.';
    RETURN;
  END IF;

  -- Reuse existing translation groups if these footer items were seeded before,
  -- so EN <-> FR stay paired and re-runs do not orphan translations.
  SELECT translation_group_id INTO v_privacy_group
    FROM public.navigation_items
    WHERE menu_key = 'FOOTER' AND url = '/privacy-policy' LIMIT 1;
  IF v_privacy_group IS NULL THEN v_privacy_group := gen_random_uuid(); END IF;

  SELECT translation_group_id INTO v_terms_group
    FROM public.navigation_items
    WHERE menu_key = 'FOOTER' AND url = '/terms-of-service' LIMIT 1;
  IF v_terms_group IS NULL THEN v_terms_group := gen_random_uuid(); END IF;

  -- Best-effort link each item to its underlying page (ON DELETE SET NULL keeps
  -- the link working even if a page is later removed; url remains the source of truth).
  SELECT id INTO v_en_privacy_page
    FROM public.pages WHERE slug = 'privacy-policy' AND language_id = v_en LIMIT 1;
  SELECT id INTO v_en_terms_page
    FROM public.pages WHERE slug = 'terms-of-service' AND language_id = v_en LIMIT 1;

  -- Remove any prior copies of the footer links we own, then re-insert cleanly.
  DELETE FROM public.navigation_items
    WHERE menu_key = 'FOOTER'
      AND url IN (
        '/privacy-policy', '/terms-of-service',
        '/politique-de-confidentialite', '/conditions-utilisation'
      );

  -- ----- English footer -----
  INSERT INTO public.navigation_items
    (language_id, menu_key, label, url, "order", page_id, translation_group_id)
  VALUES
    (v_en, 'FOOTER', 'Privacy Policy',    '/privacy-policy',    0, v_en_privacy_page, v_privacy_group),
    (v_en, 'FOOTER', 'Terms of Service',  '/terms-of-service',  1, v_en_terms_page,   v_terms_group);

  -- ----- French footer (only if the French language exists) -----
  IF v_fr IS NOT NULL THEN
    SELECT id INTO v_fr_privacy_page
      FROM public.pages WHERE slug = 'politique-de-confidentialite' AND language_id = v_fr LIMIT 1;
    SELECT id INTO v_fr_terms_page
      FROM public.pages WHERE slug = 'conditions-utilisation' AND language_id = v_fr LIMIT 1;

    INSERT INTO public.navigation_items
      (language_id, menu_key, label, url, "order", page_id, translation_group_id)
    VALUES
      (v_fr, 'FOOTER', 'Politique de confidentialité', '/politique-de-confidentialite', 0, v_fr_privacy_page, v_privacy_group),
      (v_fr, 'FOOTER', 'Conditions d''utilisation',    '/conditions-utilisation',       1, v_fr_terms_page,   v_terms_group);
  END IF;

  RAISE NOTICE 'Seeded FOOTER navigation items (Privacy Policy, Terms of Service).';
END;
$seed_footer$;
