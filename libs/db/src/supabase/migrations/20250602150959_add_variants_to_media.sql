ALTER TABLE public.media
ADD COLUMN variants JSONB NULL;

COMMENT ON COLUMN public.media.variants IS 'Stores an array of image variant objects, including different sizes and formats.';