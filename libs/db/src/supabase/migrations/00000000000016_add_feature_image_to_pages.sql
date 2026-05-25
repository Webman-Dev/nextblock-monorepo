ALTER TABLE public.pages
ADD COLUMN IF NOT EXISTS feature_image_id uuid REFERENCES public.media(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.pages.feature_image_id IS
  'ID of the media item to be used as the page feature image.';

CREATE INDEX IF NOT EXISTS idx_pages_feature_image_id
  ON public.pages (feature_image_id);
