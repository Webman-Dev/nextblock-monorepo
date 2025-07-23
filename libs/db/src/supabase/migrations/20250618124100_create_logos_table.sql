CREATE TABLE public.logos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    media_id uuid,
    CONSTRAINT logos_pkey PRIMARY KEY (id),
    CONSTRAINT logos_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.logos IS 'Stores company and brand logos.';
COMMENT ON COLUMN public.logos.name IS 'The name of the brand or company for the logo.';
COMMENT ON COLUMN public.logos.media_id IS 'Foreign key to the media table for the logo image.';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.logos TO authenticated;

ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users on logos"
ON public.logos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin users to manage logos"
ON public.logos
FOR ALL
TO authenticated
USING (((SELECT get_my_claim('user_role'::text)) = '"admin"'::jsonb))
WITH CHECK (((SELECT get_my_claim('user_role'::text)) = '"admin"'::jsonb));