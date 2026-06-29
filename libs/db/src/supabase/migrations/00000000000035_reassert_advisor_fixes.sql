-- 00000000000035_reassert_advisor_fixes.sql
-- Re-assert two Supabase Advisor (database linter) fixes that were first applied in
-- migration 00000000000028 but can be lost when a database is restored/reset to a
-- pre-028 state while its migration history still records 028 as applied (so the forward
-- tooling never re-runs it). These two advisors reappeared, so we re-apply the fixes in a
-- forward-only, idempotent way. No application behaviour changes.
--
--   1. 0011 function_search_path_mutable
--      public.handle_ucp_cart_sessions_update() needs a pinned search_path.
--   2. 0029 authenticated_security_definer_function_executable
--      public.duplicate_block_definition(uuid) must run as SECURITY INVOKER (it already
--      keeps its own ADMIN/WRITER role check and is gated by custom_block_definitions RLS).

-- 1. Pin the search_path. Re-create the function with SET search_path baked into its
--    definition (not just an ALTER) so a future CREATE OR REPLACE can't silently drop it.
--    The body only calls now() (pg_catalog, always implicitly searched), so an empty
--    search_path is safe. CREATE OR REPLACE keeps the function OID, so the existing
--    trg_handle_ucp_cart_sessions_update trigger and the service_role grant are preserved.
CREATE OR REPLACE FUNCTION public.handle_ucp_cart_sessions_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Ensure the duplicate helper runs with the caller's privileges. The function body
--    (unchanged) still raises 42501 for non-ADMIN/WRITER callers, and its SELECT/INSERT
--    are gated by custom_block_definitions RLS, so it does not need definer privileges.
ALTER FUNCTION public.duplicate_block_definition(uuid) SECURITY INVOKER;
