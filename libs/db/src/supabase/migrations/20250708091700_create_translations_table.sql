-- Create the translations table
CREATE TABLE translations (
    key TEXT PRIMARY KEY,
    translations JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add comments on the columns
COMMENT ON COLUMN translations.key IS 'A unique, slugified identifier (e.g., "sign_in_button_text").';
COMMENT ON COLUMN translations.translations IS 'Stores translations as key-value pairs (e.g., {"en": "Sign In", "fr": "s''inscrire"}).';

-- Enable Row Level Security
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access to ADMIN"
ON public.translations
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'user_role') = 'ADMIN'
)
WITH CHECK (
  (auth.jwt() ->> 'user_role') = 'ADMIN'
);

CREATE POLICY "Allow read access to all authenticated users"
ON public.translations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to all anonymous users"
ON public.translations
FOR SELECT
TO anon
USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();