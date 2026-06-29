-- 00000000000033_setup_config_settings.sql
-- DB-backed CMS configuration: move SMTP and payment-provider credentials out of
-- environment variables and into `site_settings`. Secret rows (email_secret,
-- payment_secret) hold AES-256-GCM envelopes and are restricted to ADMIN / service_role,
-- extending the sensitive-key masking established in migration 018. Public rows hold
-- non-secret config (SMTP host/from, publishable keys, provider flags) and the dashboard
-- onboarding state.
--
-- This re-issues ALL FOUR site_settings policies because the masked-key list is embedded
-- in each policy body and Postgres has no incremental "add a key" operation.

COMMENT ON TABLE public.site_settings IS 'Key-value store for global site settings. Sensitive keys (Cortex AI BYOK, Bot Protection Secret, Email secret, Payment secret) hold encrypted envelopes and are restricted to ADMIN via row-level policies.';

DROP POLICY IF EXISTS site_settings_read_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_insert_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_update_policy ON public.site_settings;
DROP POLICY IF EXISTS site_settings_delete_policy ON public.site_settings;

CREATE POLICY site_settings_read_policy
  ON public.site_settings
  FOR SELECT
  TO public
  USING (
    key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
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
      key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );

CREATE POLICY site_settings_update_policy
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (
    (
      key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  )
  WITH CHECK (
    (
      key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );

CREATE POLICY site_settings_delete_policy
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (
    (
      key NOT IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
      AND (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER')
    )
    OR (
      key IN ('cortex_ai_openrouter_api_key', 'bot_protection_secret', 'email_secret', 'payment_secret')
      AND (SELECT public.get_current_user_role()) = 'ADMIN'
    )
  );

-- Seed the new configuration rows (idempotent). Secret rows are created on first save
-- from the CMS, so they are intentionally not seeded here.
INSERT INTO public.site_settings (key, value)
VALUES ('email_public', '{"host": "", "port": "", "fromEmail": "", "fromName": "", "secure": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('payment_public', '{"stripe": {"publishableKey": ""}, "freemius": {"developerId": "", "publicKey": "", "productId": "", "sandboxEnabled": false}}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('onboarding_state', '{"dismissed": false, "skipped": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;
