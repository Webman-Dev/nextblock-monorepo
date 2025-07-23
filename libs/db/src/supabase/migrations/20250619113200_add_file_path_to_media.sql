ALTER TABLE public.media
ADD COLUMN file_path TEXT;

COMMENT ON COLUMN public.media.file_path IS 'The full path to the file in the storage bucket.';