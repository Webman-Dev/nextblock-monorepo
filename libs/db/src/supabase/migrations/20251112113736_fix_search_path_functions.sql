-- Ensure critical auth/public functions always use a safe search_path.
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_languages_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_temp, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_claim(claim TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path TO pg_temp, public
AS $$
DECLARE
    claims jsonb;
    claim_value text;
BEGIN
    -- Safely get claims, defaulting to NULL if not present or invalid JSON
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION
        WHEN invalid_text_representation THEN
            claims := NULL;
    END;

    -- If claims are NULL, return NULL
    IF claims IS NULL THEN
        RETURN NULL;
    END IF;

    -- Safely extract the claim value as text, removing quotes
    claim_value := claims ->> claim;

    RETURN claim_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_temp, public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO pg_temp, public
AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = now();
  RETURN _new;
END;
$$;

COMMIT;
