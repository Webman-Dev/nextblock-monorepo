-- 00000000000018_setup_bot_protection_settings.sql
-- NextBlock Bot Protection settings and sensitive keys policy hardening.

COMMENT ON TABLE public.site_settings IS 'Key-value store for global site settings. Sensitive keys such as Cortex AI BYOK and Bot Protection Secret Key are protected by row-level policies.';

DROP POLICY IF EXISTS site_settings_read_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_insert_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_update_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_delete_policy ON public.site_settings;

CREATE POLICY site_settings_read_policy
  ON public.site_settings
  FOR SELECT
  TO public
  USING (
    key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT auth.role()) = 'authenticated'
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );

CREATE POLICY site_settings_insert_policy
  ON public.site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );

CREATE POLICY site_settings_update_policy
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (
    (
      key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  )
  WITH CHECK (
    (
      key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );

CREATE POLICY site_settings_delete_policy
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (
    (
      key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret')
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );
