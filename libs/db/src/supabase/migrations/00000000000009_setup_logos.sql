-- 00000000000009_setup_logos.sql
-- Setup logos table

CREATE TABLE public.logos (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.logos IS 'Stores company and brand logos.';
COMMENT ON COLUMN public.logos.name IS 'The name of the brand or company for the logo.';
COMMENT ON COLUMN public.logos.media_id IS 'Foreign key to the media table for the logo image.';
