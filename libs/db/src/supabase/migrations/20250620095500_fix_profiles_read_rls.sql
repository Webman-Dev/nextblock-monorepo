-- Drop the policy if it exists to ensure a clean state.
DROP POLICY IF EXISTS "Allow user to read their own profile" ON public.profiles;

-- This policy allows an authenticated user to read their own row from the profiles table.
-- This is necessary for other RLS policies (like the one on site_settings) to be able
-- to look up the user's role during policy evaluation.
CREATE POLICY "Allow user to read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);