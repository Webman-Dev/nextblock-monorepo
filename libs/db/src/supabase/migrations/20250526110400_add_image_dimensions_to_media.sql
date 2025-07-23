ALTER TABLE public.media
ADD COLUMN width INTEGER,
ADD COLUMN height INTEGER;

-- Optional: Add a comment to describe the new columns
COMMENT ON COLUMN public.media.width IS 'Width of the image in pixels.';
COMMENT ON COLUMN public.media.height IS 'Height of the image in pixels.';

-- Backfill existing image media with nulls, or you might want to run a script later to populate them if possible
-- For now, they will be NULL by default.

-- Re-apply RLS policies if necessary, though ADD COLUMN usually doesn't require it unless policies are column-specific
-- and these new columns need to be included or excluded.
-- For simplicity, assuming existing policies are fine.