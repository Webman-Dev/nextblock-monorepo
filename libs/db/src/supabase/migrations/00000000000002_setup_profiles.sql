-- 00000000000002_setup_profiles.sql
-- Setup profiles table and auto-create trigger

-- 1. Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY, -- references auth.users(id)
  updated_at timestamp with time zone,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  website text,
  role public.user_role NOT NULL DEFAULT 'USER',

  CONSTRAINT username_length CHECK (char_length(username) >= 3)
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
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_flag_set BOOLEAN := FALSE;
  user_role public.user_role;
BEGIN
  -- Ensure the admin flag row exists (redundant if seeded, but safe)
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

  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
