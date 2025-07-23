ALTER TABLE public.media
ADD COLUMN blur_data_url TEXT NULL;

COMMENT ON COLUMN public.media.blur_data_url IS 'Stores the base64 encoded string for image blur placeholders.';