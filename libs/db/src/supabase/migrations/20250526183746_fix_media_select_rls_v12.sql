-- supabase/migrations/YYYYMMDDHHMMSS_fix_media_select_rls_v12.sql

BEGIN;

-- == MEDIA ==

-- Drop the existing specific SELECT policy for the 'USER' role,
-- as we will replace it with a broader one for all authenticated users.
DROP POLICY IF EXISTS "media_user_role_can_read" ON public.media;
-- Drop any older variations that might exist from previous attempts if their names were different
DROP POLICY IF EXISTS "media_user_can_read" ON public.media;
DROP POLICY IF EXISTS "media_readable_by_anon_and_non_privileged_users" ON public.media;


-- Policy for anonymous users to read media (ensure this is in place and correct)
-- This policy allows anyone to read any media record if no other policy restricts them.
-- This is generally desired if your R2 bucket URLs are guessable or if images are meant to be public.
DROP POLICY IF EXISTS "media_anon_can_read" ON public.media; -- From _v6/_v7 logic
DROP POLICY IF EXISTS "media_is_publicly_readable_by_all" ON public.media; -- From _v8 logic
DROP POLICY IF EXISTS "media_is_readable_by_all" ON public.media; -- Older name
DROP POLICY IF EXISTS "media_are_publicly_readable" ON public.media; -- Older name

CREATE POLICY "media_public_can_read" ON public.media
  FOR SELECT
  USING (true); -- Allows both 'anon' and 'authenticated' roles to read by default
COMMENT ON POLICY "media_public_can_read" ON public.media IS 'All users (anonymous and authenticated) can read media records. This is the general read access.';


-- The admin/writer management policies for INSERT, UPDATE, DELETE remain as they are (write-only).
-- e.g., "media_admin_writer_can_insert", "media_admin_writer_can_update", "media_admin_writer_can_delete"
-- These do NOT provide SELECT access.

-- With the "media_public_can_read" policy USING (true), all authenticated users (USER, WRITER, ADMIN)
-- will have SELECT access. This should resolve the error when fetching feature_image_id details
-- and allow images to be displayed.
-- This will also mean the linter should not complain about "multiple permissive policies for authenticated SELECT"
-- because the management policies are write-only, and there's now one clear "public read" policy for SELECT.

COMMIT;