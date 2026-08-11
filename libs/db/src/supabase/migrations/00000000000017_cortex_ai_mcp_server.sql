-- Cortex AI MCP (Model Context Protocol) server access.
--
-- Adds the bearer-token store that gates /api/mcp, the endpoint that exposes the
-- Cortex AI tool registry to external MCP clients (Claude Code, Claude Desktop,
-- Cursor, VS Code). Two pieces:
--
--   1. public.mcp_access_tokens — one row per issued token. We store ONLY the
--      SHA-256 hash of the token, never the token itself: the plaintext is shown
--      to the admin exactly once at mint time and is unrecoverable afterwards, so
--      a database leak cannot be replayed against the MCP endpoint. `token_prefix`
--      is the non-secret leading fragment kept purely so the UI can tell two tokens
--      apart in a list.
--
--   2. cortex_ai_mcp_settings — a non-secret JSON site_settings row holding the
--      server on/off switch and the localhost-trust flag. It is added to all four
--      site_settings policies so only authenticated ADMINs can read or write it;
--      the MCP route itself reads it through the service-role client, which
--      bypasses RLS.
--
-- Forward-only. Recreates the four site_settings policies idempotently, preserving
-- every key already in each policy's sensitive array (note that
-- language_detection_settings stays anon-READABLE and so is absent from the SELECT
-- policy, exactly as migration 00000000000012 left it).

CREATE TABLE IF NOT EXISTS public.mcp_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  -- Lowercase hex SHA-256 of the plaintext token. Unique so a lookup is a single
  -- indexed equality probe and duplicate mints are impossible.
  token_hash text NOT NULL UNIQUE,
  -- Non-secret display fragment, e.g. "nbmcp_a1b2c3d4". Never enough to authenticate.
  token_prefix text NOT NULL,
  -- 'read' grants the read-only tools; 'write' additionally grants the mutating ones.
  scopes text[] NOT NULL DEFAULT ARRAY['read', 'write']::text[],
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);

COMMENT ON TABLE public.mcp_access_tokens IS
  'Bearer tokens for the Cortex AI MCP server at /api/mcp. Stores SHA-256 hashes only; plaintext is displayed once at mint time.';

CREATE INDEX IF NOT EXISTS mcp_access_tokens_token_hash_idx
  ON public.mcp_access_tokens (token_hash);

-- Orders the admin token list newest-first without a sort.
CREATE INDEX IF NOT EXISTS mcp_access_tokens_created_at_idx
  ON public.mcp_access_tokens (created_at DESC);

ALTER TABLE public.mcp_access_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens are credentials: admin-only, with no anon or WRITER access at all. The
-- MCP route verifies them with the service-role client, which bypasses RLS.
DROP POLICY IF EXISTS mcp_access_tokens_admin_select ON public.mcp_access_tokens;
CREATE POLICY mcp_access_tokens_admin_select ON public.mcp_access_tokens
  FOR SELECT TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role);

DROP POLICY IF EXISTS mcp_access_tokens_admin_insert ON public.mcp_access_tokens;
CREATE POLICY mcp_access_tokens_admin_insert ON public.mcp_access_tokens
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role);

DROP POLICY IF EXISTS mcp_access_tokens_admin_update ON public.mcp_access_tokens;
CREATE POLICY mcp_access_tokens_admin_update ON public.mcp_access_tokens
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role)
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role);

DROP POLICY IF EXISTS mcp_access_tokens_admin_delete ON public.mcp_access_tokens;
CREATE POLICY mcp_access_tokens_admin_delete ON public.mcp_access_tokens
  FOR DELETE TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_access_tokens TO authenticated;
GRANT ALL ON public.mcp_access_tokens TO service_role;

-- Add cortex_ai_mcp_settings to the admin-only site_settings group (all four policies).
DROP POLICY IF EXISTS site_settings_read_policy ON public.site_settings;
CREATE POLICY site_settings_read_policy ON public.site_settings FOR SELECT USING (((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT auth.role() AS role) = 'authenticated'::text) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));

DROP POLICY IF EXISTS site_settings_insert_policy ON public.site_settings;
CREATE POLICY site_settings_insert_policy ON public.site_settings FOR INSERT TO authenticated WITH CHECK ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));

DROP POLICY IF EXISTS site_settings_update_policy ON public.site_settings;
CREATE POLICY site_settings_update_policy ON public.site_settings FOR UPDATE TO authenticated USING ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role)))) WITH CHECK ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));

DROP POLICY IF EXISTS site_settings_delete_policy ON public.site_settings;
CREATE POLICY site_settings_delete_policy ON public.site_settings FOR DELETE TO authenticated USING ((((key <> ALL (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) OR ((key = ANY (ARRAY['cortex_ai_openrouter_api_key'::text, 'bot_protection_secret'::text, 'email_secret'::text, 'payment_secret'::text, 'language_detection_settings'::text, 'cortex_ai_pexels_api_key'::text, 'cortex_ai_unsplash_access_key'::text, 'cortex_ai_mcp_settings'::text])) AND (( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role))));
