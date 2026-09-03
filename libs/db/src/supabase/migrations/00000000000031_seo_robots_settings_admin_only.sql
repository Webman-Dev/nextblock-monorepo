-- Restrict writes to the robots.txt settings row to ADMIN only.
--
-- `site_settings.seo_robots_settings` is the row that decides whether the whole site
-- is crawlable: app/robots.ts reads it on every /robots.txt hit and serves a blanket
-- `Disallow: /` when `isIndexingEnabled` is false. The CMS only offers that switch
-- under /cms/settings/seo, and `saveRobotsSettings` re-checks for ADMIN before it
-- writes — but RLS is the independent boundary, and it did not agree. The baseline
-- write policies let ADMIN *or* WRITER write any key outside the sensitive array, so
-- a WRITER holding a normal session could PATCH this row through PostgREST and take
-- the entire site out of Google. That failure is quiet (nothing in the CMS shows it),
-- slow to notice (search traffic decays over weeks) and hard to attribute after the
-- fact, which is why the database has to refuse it rather than trusting the one
-- server action that happens to guard it today.
--
-- The SELECT policy is deliberately NOT touched. This key must stay anon-READABLE:
-- app/robots.ts reads it with the anon (SSG) client on every crawl, and adding the key
-- to the read policy's sensitive array would make robots.txt fall back to its
-- permissive defaults for every crawler. Only INSERT/UPDATE/DELETE move to ADMIN-only,
-- matching the UI boundary — exactly the shape migration 00000000000011 used for
-- language_detection_settings, which is anon-readable for the same reason.
--
-- Every key already present in each policy's array is preserved (dropping one would
-- silently widen write access back to WRITER for that key); `seo_robots_settings` is
-- appended to the three write policies only.

DROP POLICY IF EXISTS site_settings_insert_policy ON public.site_settings;
CREATE POLICY site_settings_insert_policy ON public.site_settings FOR INSERT TO authenticated WITH CHECK ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text, 'seo_robots_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text, 'seo_robots_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));

DROP POLICY IF EXISTS site_settings_update_policy ON public.site_settings;
CREATE POLICY site_settings_update_policy ON public.site_settings FOR UPDATE TO authenticated USING ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text, 'seo_robots_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text, 'seo_robots_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role)))) WITH CHECK ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text, 'seo_robots_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text, 'seo_robots_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));

DROP POLICY IF EXISTS site_settings_delete_policy ON public.site_settings;
CREATE POLICY site_settings_delete_policy ON public.site_settings FOR DELETE TO authenticated USING ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text, 'seo_robots_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text, 'seo_robots_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));

-- Forward-only and idempotent.
