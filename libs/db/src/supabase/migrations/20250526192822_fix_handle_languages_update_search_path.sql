-- supabase/migrations/YYYYMMDDHHMMSS_fix_handle_languages_update_search_path.sql
-- (Replace YYYYMMDDHHMMSS with the actual timestamp of this migration file)

BEGIN;

-- Step 1: Drop the existing trigger that depends on the function.
DROP TRIGGER IF EXISTS on_languages_update ON public.languages;

-- Step 2: Now it's safe to drop and recreate the function.
DROP FUNCTION IF EXISTS public.handle_languages_update();

CREATE OR REPLACE FUNCTION public.handle_languages_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Explicitly set security context
SET search_path = public -- Explicitly set search_path
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_languages_update() IS 'Sets updated_at timestamp on language update. Includes explicit search_path and security definer.';

-- Step 3: Re-create the trigger to use the updated function.
CREATE TRIGGER on_languages_update
  BEFORE UPDATE ON public.languages
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_languages_update();

COMMIT;