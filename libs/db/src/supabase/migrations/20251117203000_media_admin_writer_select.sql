-- Allow ADMIN/WRITER to read media rows (needed for media library + logos)

BEGIN;

DROP POLICY IF EXISTS media_admin_writer_can_read ON public.media;
CREATE POLICY media_admin_writer_can_read ON public.media
  FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));

COMMIT;
