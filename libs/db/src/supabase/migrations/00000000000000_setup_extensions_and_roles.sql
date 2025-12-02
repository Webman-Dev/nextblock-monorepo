-- 00000000000000_setup_extensions_and_roles.sql
-- Base setup: Extensions, Enums, Helper Functions, and Grants

-- 1. Grants
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 2. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WRITER', 'USER');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'page_status') THEN
    CREATE TYPE public.page_status AS ENUM ('draft', 'published', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'menu_location') THEN
    CREATE TYPE public.menu_location AS ENUM ('HEADER', 'FOOTER', 'SIDEBAR');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'revision_type') THEN
    CREATE TYPE public.revision_type AS ENUM ('snapshot', 'diff');
  END IF;
END
$$;

-- 3. Helper Functions

-- Function: get_my_claim
-- Description: Helper to read JWT claims safely
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)
RETURNS JSONB AS $$
  SET search_path = '';
  SELECT COALESCE(current_setting('request.jwt.claims', true)::JSONB ->> claim, NULL)::JSONB
$$ LANGUAGE SQL STABLE;

-- Function: get_current_user_role
-- Description: Fetches the role of the currently authenticated user.
-- SECURITY DEFINER to prevent RLS recursion issues when used in policies.
-- Note: This depends on the 'profiles' table which will be created in the next migration.
-- However, since functions are just definitions, this CREATE statement will succeed 
-- as long as the table exists when the function is *called*.
-- To be safe and avoid "relation does not exist" errors during creation if validation runs,
-- we will defer the creation of this specific function to the profiles migration 
-- OR just ensure profiles is created immediately after. 
-- Actually, let's put it here but be aware it needs profiles table to run.
-- Postgres allows creating functions referring to non-existent tables? No, it usually checks.
-- So I will move `get_current_user_role` to `setup_profiles.sql` or create a placeholder table?
-- Better: I'll put it in `setup_profiles.sql` after the table is created.

