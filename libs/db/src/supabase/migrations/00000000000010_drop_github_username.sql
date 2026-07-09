-- Drop the github_username profile column and remove the GitHub-auth artifacts.
--
-- GitHub OAuth sign-in / account-linking was removed from the app: it cannot be
-- provisioned as part of a one-click deployment (each install needs its own GitHub
-- OAuth app + client secret + Supabase's manual-linking toggle, none of which can
-- ship in a migration). github_username was only ever populated from that OAuth
-- flow, so the column and its seed strings are now dead.
--
-- NOTE: the self-update "Connect GitHub" flow (lib/updates/*, ConnectGitHubButton)
-- is a separate feature and is intentionally left untouched — the connect_github
-- translation is kept for it.

-- 1. Rewrite handle_new_user() so new signups no longer read/populate github_username.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_flag_set boolean := false;
  user_role public.user_role;
  v_full_name text;
  v_avatar_url text;
BEGIN
  INSERT INTO public.site_settings (key, value)
  VALUES ('is_admin_created', 'false'::jsonb)
  ON CONFLICT (key) DO NOTHING;

  SELECT COALESCE(value::jsonb::boolean, false)
    INTO admin_flag_set
  FROM public.site_settings
  WHERE key = 'is_admin_created'
  FOR UPDATE;

  IF admin_flag_set = false THEN
    user_role := 'ADMIN'::public.user_role;

    UPDATE public.site_settings
    SET value = 'true'::jsonb
    WHERE key = 'is_admin_created';
  ELSE
    user_role := 'USER'::public.user_role;
  END IF;

  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    user_role,
    v_full_name,
    v_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

  RETURN NEW;
END;
$$;

-- 2. Drop the column now that nothing writes it.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS github_username;

-- 3. Remove the GitHub-auth-only translation strings. connect_github is intentionally
--    kept — it is still used by the self-update "Connect GitHub" button.
DELETE FROM public.translations
WHERE key IN (
  'continue_with_github',
  'github_username',
  'github_username_help',
  'github_link_failed',
  'github_connected'
);
