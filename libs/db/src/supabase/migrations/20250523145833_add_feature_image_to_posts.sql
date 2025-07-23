ALTER TABLE public.posts
ADD COLUMN feature_image_id UUID,
ADD CONSTRAINT fk_feature_image
    FOREIGN KEY (feature_image_id)
    REFERENCES public.media(id)
    ON DELETE SET NULL;

COMMENT ON COLUMN public.posts.feature_image_id IS 'ID of the media item to be used as the post''s feature image.';