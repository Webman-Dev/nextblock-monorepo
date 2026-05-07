-- 00000000000011_setup_cortex_ai_settings.sql
-- NextBlock Cortex AI settings and sensitive BYOK policy hardening.

COMMENT ON TABLE public.site_settings IS 'Key-value store for global site settings. Sensitive keys such as Cortex AI BYOK are protected by row-level policies.';

DROP POLICY IF EXISTS site_settings_read_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_insert_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_update_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_delete_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_sensitive_read_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_sensitive_insert_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_sensitive_update_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_sensitive_delete_policy ON public.site_settings;

CREATE POLICY site_settings_read_policy
  ON public.site_settings
  FOR SELECT
  TO public
  USING (
    key <> 'cortex_ai_openrouter_api_key'
    OR (
      key = 'cortex_ai_openrouter_api_key'
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
      key <> 'cortex_ai_openrouter_api_key'
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key = 'cortex_ai_openrouter_api_key'
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );

CREATE POLICY site_settings_update_policy
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (
    (
      key <> 'cortex_ai_openrouter_api_key'
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key = 'cortex_ai_openrouter_api_key'
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  )
  WITH CHECK (
    (
      key <> 'cortex_ai_openrouter_api_key'
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key = 'cortex_ai_openrouter_api_key'
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );

CREATE POLICY site_settings_delete_policy
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (
    (
      key <> 'cortex_ai_openrouter_api_key'
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key = 'cortex_ai_openrouter_api_key'
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );
