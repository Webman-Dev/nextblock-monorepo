-- Add a folder column to organize media by path prefix
ALTER TABLE public.media
ADD COLUMN IF NOT EXISTS folder TEXT;

COMMENT ON COLUMN public.media.folder IS 'Folder path prefix for the R2 object (e.g., images/summer/).';

-- Backfill existing rows by deriving folder from object_key (everything up to last slash)
UPDATE public.media
SET folder = NULLIF(regexp_replace(object_key, '[^/]*$', ''), '')
WHERE folder IS NULL;

-- Index to speed up filtering by folder
CREATE INDEX IF NOT EXISTS media_folder_idx ON public.media (folder);

