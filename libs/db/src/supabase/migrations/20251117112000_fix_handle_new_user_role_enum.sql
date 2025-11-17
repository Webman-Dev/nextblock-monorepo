-- Ensure handle_new_user uses the enum type and works with the KV admin flag

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
  -- Ensure the admin flag row exists
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

-- Drop and recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
