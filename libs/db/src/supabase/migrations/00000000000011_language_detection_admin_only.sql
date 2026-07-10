-- Restrict writes to the language-detection settings row to ADMIN only.
--
-- `site_settings.language_detection_settings` is a non-sensitive, anon-READABLE
-- key (the request proxy reads it with the anon client to pick a visitor's first
-- language). The CMS surfaces it under /cms/settings (ADMIN-only) and the server
-- action guards with an ADMIN check, but the baseline write policies let ADMIN
-- *or* WRITER write any non-sensitive key — so a WRITER could change site-wide
-- detection directly via PostgREST. This migration adds the key to the ADMIN-only
-- write group (INSERT/UPDATE/DELETE) to match the UI boundary, while leaving the
-- SELECT policy untouched so the proxy's anon read keeps working.
--
-- Forward-only; recreates the three write policies idempotently.

DROP POLICY IF EXISTS site_settings_insert_policy ON public.site_settings;
CREATE POLICY site_settings_insert_policy ON public.site_settings FOR INSERT TO authenticated WITH CHECK ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));

DROP POLICY IF EXISTS site_settings_update_policy ON public.site_settings;
CREATE POLICY site_settings_update_policy ON public.site_settings FOR UPDATE TO authenticated USING ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role)))) WITH CHECK ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));

DROP POLICY IF EXISTS site_settings_delete_policy ON public.site_settings;
CREATE POLICY site_settings_delete_policy ON public.site_settings FOR DELETE TO authenticated USING ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));
