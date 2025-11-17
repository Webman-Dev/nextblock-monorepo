-- Fix media permissions: ensure grants and RLS policies for admin/writer and service_role

BEGIN;

-- Privileges (required in addition to RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated, service_role;

-- Reset policies to known good set
DROP POLICY IF EXISTS media_admin_writer_can_insert ON public.media;
DROP POLICY IF EXISTS media_admin_writer_can_update ON public.media;
DROP POLICY IF EXISTS media_admin_writer_can_delete ON public.media;
DROP POLICY IF EXISTS media_admin_writer_can_read ON public.media;
DROP POLICY IF EXISTS media_service_role_insert ON public.media;
DROP POLICY IF EXISTS media_service_role_select ON public.media;

-- Admin/Writer: full CRUD
CREATE POLICY media_admin_writer_can_insert ON public.media
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));

CREATE POLICY media_admin_writer_can_update ON public.media
  FOR UPDATE TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));

CREATE POLICY media_admin_writer_can_delete ON public.media
  FOR DELETE TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));

CREATE POLICY media_admin_writer_can_read ON public.media
  FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));

-- service_role: insert + read (used by upload flows)
CREATE POLICY media_service_role_insert ON public.media
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY media_service_role_select ON public.media
  FOR SELECT TO service_role
  USING (true);

COMMIT;
