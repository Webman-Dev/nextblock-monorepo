-- 00000000000002_setup_profiles.sql
-- Setup profiles table and auto-create trigger

-- 1. Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY, -- references auth.users(id)
  updated_at timestamp with time zone,
  -- username text UNIQUE, -- REMOVED as per user request
  full_name text,
  avatar_url text,
  website text,
  github_username text, -- Added from 20260116124500
  phone text,           -- Added from 20260116124500
  billing_address jsonb, -- Added from 20260116124500
  role public.user_role NOT NULL DEFAULT 'USER'
);

-- Foreign key to auth.users
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users (id)
  ON DELETE CASCADE;

COMMENT ON TABLE public.profiles IS 'Profile information for each user, extending auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.role IS 'User role for RBAC.';

-- 2. Helper Function: get_current_user_role
-- Now that profiles table exists, we can define this function.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS 'Fetches the role of the currently authenticated user. SECURITY DEFINER to prevent RLS recursion issues.';

-- 3. Trigger: handle_new_user
-- Automatically creates a profile when a new user signs up.
-- Assigns 'ADMIN' to the first user, 'USER' to subsequent users.
-- Extracts GitHub metadata if available.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_flag_set BOOLEAN := FALSE;
  user_role public.user_role;
  v_full_name text;
  v_avatar_url text;
  v_github_username text;
  v_provider text;
BEGIN
  -- 1. Role Assignment Logic
  INSERT INTO public.site_settings (key, value)
  VALUES ('is_admin_created', 'false'::jsonb)
  ON CONFLICT (key) DO NOTHING;

  -- Lock and read the flag
  SELECT COALESCE((value)::jsonb::boolean, FALSE)
  INTO admin_flag_set
  FROM public.site_settings
  WHERE key = 'is_admin_created'
  FOR UPDATE;

  IF admin_flag_set = FALSE THEN
    user_role := 'ADMIN'::public.user_role;
    UPDATE public.site_settings
    SET value = 'true'::jsonb
    WHERE key = 'is_admin_created';
  ELSE
    user_role := 'USER'::public.user_role;
  END IF;

  -- 2. Data Extraction
  v_full_name := new.raw_user_meta_data->>'full_name';
  v_avatar_url := new.raw_user_meta_data->>'avatar_url';
  
  -- Check provider (usually in app_metadata)
  v_provider := new.raw_app_meta_data->>'provider';
  
  -- GitHub Username Extraction
  IF v_provider = 'github' OR (new.raw_user_meta_data->>'iss') LIKE '%github%' THEN
     v_github_username := COALESCE(
       new.raw_user_meta_data->>'user_name',
       new.raw_user_meta_data->>'preferred_username'
     );
  ELSE
     v_github_username := NULL;
  END IF;

  -- 3. Insert into profiles
  -- Use ON CONFLICT DO NOTHING to avoid duplicate key errors if the profile somehow exists
  INSERT INTO public.profiles (
    id, 
    role, 
    full_name, 
    avatar_url, 
    github_username
  )
  VALUES (
    NEW.id, 
    user_role, 
    v_full_name, 
    v_avatar_url, 
    v_github_username
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    github_username = EXCLUDED.github_username;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Translations are now handled in 00000000000010_setup_translations.sql

-- 4. Backfill missing profiles for existing auth.users
-- This ensures that if the public schema is reset but auth users persist, profiles are recreated.
DO $$
DECLARE
    missing_user RECORD;
    v_github_username text;
    v_full_name text;
    v_role public.user_role;
    v_admin_exists boolean;
BEGIN
    -- Check if any admin profile already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'ADMIN') INTO v_admin_exists;

    FOR missing_user IN 
        SELECT * FROM auth.users 
        WHERE id NOT IN (SELECT id FROM public.profiles)
        ORDER BY created_at ASC -- Process oldest users first to preserve likely admin ownership
    LOOP
        -- Extract GitHub logic for backfill
        IF missing_user.raw_app_meta_data->>'provider' = 'github' OR (missing_user.raw_user_meta_data->>'iss') LIKE '%github%' THEN
            v_github_username := COALESCE(
                missing_user.raw_user_meta_data->>'user_name',
                missing_user.raw_user_meta_data->>'preferred_username'
            );
        ELSE
            v_github_username := NULL;
        END IF;

        v_full_name := missing_user.raw_user_meta_data->>'full_name';

        -- Determine Role: First user found (when no admin exists) becomes ADMIN
        IF v_admin_exists = FALSE THEN
            v_role := 'ADMIN';
            v_admin_exists := TRUE; -- Mark as existing so subsequent users are USER
            
            -- Sync site_settings
            INSERT INTO public.site_settings (key, value) VALUES ('is_admin_created', 'true'::jsonb)
             ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb;
        ELSE
            v_role := 'USER';
        END IF;
        
        INSERT INTO public.profiles (id, role, full_name, avatar_url, github_username)
        VALUES (
            missing_user.id,
            v_role,
            v_full_name,
            missing_user.raw_user_meta_data->>'avatar_url',
            v_github_username
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Backfilled profile for user % as %', missing_user.id, v_role;
    END LOOP;
END;
$$;
