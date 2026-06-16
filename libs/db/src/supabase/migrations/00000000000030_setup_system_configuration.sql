-- 00000000000030_setup_system_configuration.sql
-- First-Boot Setup Wizard: global system configuration.
--
-- Adds a dedicated, RLS-locked `system_configuration` table that holds settings the
-- browser /setup wizard manages and that don't belong in the public key-value
-- `site_settings` store. It is a singleton (exactly one row, id = 1).
--
-- Shape:
--   auto_accept_signups boolean  -- when true, new public sign-ups skip outbound email
--                                   verification (the signup route uses a service-role
--                                   admin.createUser({ email_confirm: true }) path).
--   settings            jsonb    -- forward-compatible catch-all for future feature
--                                   toggles ({} by default). Do NOT store true secrets
--                                   here (Turnstile/AI secrets keep living in their
--                                   existing site_settings sensitive keys).
--
-- Access is locked to the ADMIN role for normal clients (NextBlock has no separate
-- "super-admin" tier — ADMIN is the top level). The service_role retains full access
-- so the wizard can seed/read it before any admin exists.

CREATE TABLE IF NOT EXISTS public.system_configuration (
  id integer PRIMARY KEY DEFAULT 1,
  auto_accept_signups boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_configuration_singleton CHECK (id = 1)
);

COMMENT ON TABLE public.system_configuration IS
  'Singleton (id = 1) of global setup-wizard configuration. ADMIN-only via RLS; never store secrets in settings.';

-- Seed the single row so reads always find it.
INSERT INTO public.system_configuration (id, auto_accept_signups, settings)
VALUES (1, false, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.system_configuration ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_configuration TO authenticated;
GRANT ALL ON public.system_configuration TO service_role;

-- ADMIN-only for every operation by authenticated clients.
DROP POLICY IF EXISTS system_configuration_admin_select ON public.system_configuration;
CREATE POLICY system_configuration_admin_select
  ON public.system_configuration
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN');

DROP POLICY IF EXISTS system_configuration_admin_insert ON public.system_configuration;
CREATE POLICY system_configuration_admin_insert
  ON public.system_configuration
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

DROP POLICY IF EXISTS system_configuration_admin_update ON public.system_configuration;
CREATE POLICY system_configuration_admin_update
  ON public.system_configuration
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN')
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

DROP POLICY IF EXISTS system_configuration_admin_delete ON public.system_configuration;
CREATE POLICY system_configuration_admin_delete
  ON public.system_configuration
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN');

-- Service role bypasses the ADMIN checks (used by the wizard before an admin exists,
-- and by the signup route to read auto_accept_signups as an anonymous visitor).
DROP POLICY IF EXISTS system_configuration_service_role_all ON public.system_configuration;
CREATE POLICY system_configuration_service_role_all
  ON public.system_configuration
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
