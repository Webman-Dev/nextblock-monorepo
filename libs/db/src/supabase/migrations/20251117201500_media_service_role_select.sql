-- Ensure service_role can read media rows (needed when uploads write media + linked inserts)

BEGIN;

DROP POLICY IF EXISTS media_service_role_select ON public.media;
CREATE POLICY media_service_role_select ON public.media
  FOR SELECT
  TO service_role
  USING (true);

COMMIT;
