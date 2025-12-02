-- 00000000000004_setup_media.sql
-- Setup media table

CREATE TABLE public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  object_key text NOT NULL UNIQUE,
  file_type text,
  size_bytes bigint,
  description text,
  
  -- Added columns
  width integer,
  height integer,
  blur_data_url text,
  variants jsonb,
  file_path text,
  folder text,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.media IS 'Stores information about uploaded media assets.';
COMMENT ON COLUMN public.media.object_key IS 'Unique key (path) in Cloudflare R2.';
COMMENT ON COLUMN public.media.width IS 'Width of the image in pixels.';
COMMENT ON COLUMN public.media.height IS 'Height of the image in pixels.';
COMMENT ON COLUMN public.media.blur_data_url IS 'Base64 encoded string for image blur placeholders.';
COMMENT ON COLUMN public.media.variants IS 'Array of image variant objects.';
COMMENT ON COLUMN public.media.file_path IS 'Full path to the file in the storage bucket.';
COMMENT ON COLUMN public.media.folder IS 'Folder path prefix for the R2 object.';

-- Indexes
CREATE INDEX idx_media_uploader_id ON public.media(uploader_id);
CREATE INDEX media_folder_idx ON public.media(folder);

-- Trigger: handle_media_update
CREATE OR REPLACE FUNCTION public.handle_media_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_media_update
  BEFORE UPDATE ON public.media
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_media_update();
