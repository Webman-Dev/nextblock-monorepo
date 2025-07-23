-- Step 1: Drop all dependent policies first.
DROP POLICY IF EXISTS "Allow admins to manage logos" ON public.logos;
DROP POLICY IF EXISTS "Allow users to insert logos" ON public.logos;
DROP POLICY IF EXISTS "Allow logo insert for writers and admins" ON public.logos;
DROP POLICY IF EXISTS "Allow logo update for admins" ON public.logos;
DROP POLICY IF EXISTS "Allow logo delete for admins" ON public.logos;
DROP POLICY IF EXISTS "Allow logo insert for authenticated users" ON public.logos;
DROP POLICY IF EXISTS "Allow logo update for authenticated users" ON public.logos;
DROP POLICY IF EXISTS "Allow logo delete for authenticated users" ON public.logos;

-- Step 2: Drop the old function to avoid return type conflicts.
-- Note: It's critical to drop policies before the function they depend on.
DROP FUNCTION IF EXISTS get_my_claim(text) CASCADE;

-- Step 3: Redefine the get_my_claim function to be more robust and return TEXT.
-- This avoids JSON casting errors and type mismatches in policies.
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql VOLATILE;


-- Create the new, correct policies using the updated function
CREATE POLICY "Allow logo insert for authenticated users"
ON public.logos
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow logo update for authenticated users"
ON public.logos
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow logo delete for authenticated users"
ON public.logos
FOR DELETE
USING (auth.role() = 'authenticated');