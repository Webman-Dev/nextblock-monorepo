-- supabase/migrations/20251126100000_seed_site_logo.sql

DO $$
DECLARE
  v_logo_media_id UUID := gen_random_uuid();
  v_admin_id UUID;
BEGIN
  -- Get an admin user ID to set as uploader (optional, fallback to NULL)
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;

  -- Insert the logo into the media table
  INSERT INTO public.media (id, uploader_id, file_name, object_key, file_type, size_bytes, description)
  VALUES (
    v_logo_media_id,
    v_admin_id,
    'nextblock-logo-small.webp',
    '/images/nextblock-logo-small.webp',
    'image/webp',
    10000, -- Dummy size
    'NextBlock Site Logo'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = excluded.file_name,
    file_type = excluded.file_type,
    description = excluded.description
  RETURNING id INTO v_logo_media_id;

  -- Insert the logo into the logos table
  INSERT INTO public.logos (name, media_id)
  VALUES ('NextBlock Logo', v_logo_media_id);

END $$;
