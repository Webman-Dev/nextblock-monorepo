-- Add is_active column to languages table
ALTER TABLE public.languages
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.languages.is_active IS 'Indicates if the language is currently active and available for use.';