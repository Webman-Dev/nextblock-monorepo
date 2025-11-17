-- Allows service_role to insert media records (used by signed upload flows)
-- without weakening existing RLS for other roles.

BEGIN;

-- Ensure idempotency for Supabase PG version (CREATE POLICY IF NOT EXISTS not available)
DROP POLICY IF EXISTS media_service_role_insert ON public.media;

CREATE POLICY media_service_role_insert ON public.media
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMIT;
