-- 00000000000020_add_category_translations.sql
-- Add name_translations and description_translations columns to public.categories.

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS name_translations jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS description_translations jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN public.categories.name_translations IS 'Translated category names (e.g. {"fr": "Numérique"}).';
COMMENT ON COLUMN public.categories.description_translations IS 'Translated category descriptions.';
