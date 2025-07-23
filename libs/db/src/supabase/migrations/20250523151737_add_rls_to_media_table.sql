-- Drop existing policies if they exist, then recreate them.

-- Policy for public read access
DROP POLICY IF EXISTS "media_are_publicly_readable" ON public.media;

CREATE POLICY "media_are_publicly_readable"
ON public.media FOR SELECT
TO anon, authenticated
USING (true);

-- Policy for admin/writer management
DROP POLICY IF EXISTS "admins_and_writers_can_manage_media" ON public.media;

CREATE POLICY "admins_and_writers_can_manage_media"
ON public.media FOR ALL
TO authenticated
USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))
WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'));