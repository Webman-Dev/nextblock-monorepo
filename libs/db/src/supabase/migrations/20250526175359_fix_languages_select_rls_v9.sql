-- supabase/migrations/YYYYMMDDHHMMSS_fix_languages_select_rls_v9.sql

BEGIN;

-- == LANGUAGES ==
-- Drop the specific authenticated non-admin policy
DROP POLICY IF EXISTS "languages_authenticated_non_admin_can_read" ON public.languages;
DROP POLICY IF EXISTS "languages_user_can_read" ON public.languages; -- If this was the one from v5 attempt

-- Create a simpler, broader SELECT policy for all authenticated users for the languages table.
-- The "multiple_permissive_policies" warning for languages was between "languages_admin_management" (FOR ALL)
-- and "languages_authenticated_non_admin_can_read".
-- If "languages_admin_management" is FOR ALL, it handles SELECT for admins.
-- We need a SELECT policy for authenticated users who are NOT admins.

-- Option 1: Keep admin SELECT via FOR ALL, and add specific for USER/WRITER
-- (This is what was in _v6.sql basically and was still warned by linter, but might be a linter quirk)
-- CREATE POLICY "languages_user_writer_can_read" ON public.languages
--   FOR SELECT TO authenticated
--   USING (public.get_current_user_role() IN ('USER', 'WRITER'));

-- Option 2: Make the "publicly readable" policy truly public for SELECT FOR ALL ROLES,
-- and ensure the admin management policy is ONLY for writes. This was the _v7.sql approach which failed syntax.

-- Let's retry the _v7 approach for *just* the languages table, as it's the most robust against the linter.
-- We need to be absolutely sure about the FOR INSERT, UPDATE, DELETE syntax.
-- If that syntax is the absolute blocker, we're in a tough spot.

-- Assuming the error "JSON object requested, multiple (or no) rows returned" means NO rows were returned,
-- it means NO select policy was satisfied for the 'languages' table by the role executing getNavigationMenu.

-- Let's make languages readable by any authenticated user, plus the existing anon policy.
-- This might re-trigger the "multiple_permissive_policies" if the admin FOR ALL policy is still active,
-- but it should fix the immediate "0 rows returned" error.
CREATE POLICY "languages_authenticated_can_read" ON public.languages
  FOR SELECT
  TO authenticated
  USING (true); -- Any authenticated user can read languages.
COMMENT ON POLICY "languages_authenticated_can_read" ON public.languages IS 'Any authenticated user can read languages.';

-- "languages_anon_can_read" (FOR SELECT TO anon USING (true)) should still be active and is fine.
-- "languages_admin_management" (FOR ALL TO authenticated USING role = ADMIN) is assumed to be active.

-- This setup WILL cause a "multiple_permissive_policies" warning for an authenticated ADMIN
-- because "languages_authenticated_can_read" (USING true) and the SELECT part of
-- "languages_admin_management" (USING role=ADMIN) will both apply.

-- The root cause of the "0 rows returned" is that *neither* of the v6 policies for authenticated
-- was being met by the server-side client running getNavigationMenu, OR the client was anon
-- and "languages_anon_can_read" was somehow not effective or missing.

-- To ensure the `getNavigationMenu` function works for ANY role calling it:
-- Let's reinstate a very simple public read policy for languages.
-- This was the original policy from `20250514143016_setup_languages_table.sql`:
-- `CREATE POLICY "languages_are_publicly_readable" ON public.languages FOR SELECT TO anon, authenticated USING (true);`
-- This was later split.

-- Cleanest approach to fix the immediate error, and then we can re-evaluate the linter:
-- Ensure there's one policy that makes languages readable to everyone for SELECT.
DROP POLICY IF EXISTS "languages_anon_can_read" ON public.languages;
DROP POLICY IF EXISTS "languages_user_can_read" ON public.languages;
DROP POLICY IF EXISTS "languages_authenticated_non_admin_can_read" ON public.languages;
DROP POLICY IF EXISTS "languages_authenticated_can_read" ON public.languages;
DROP POLICY IF EXISTS "languages_are_publicly_readable_by_all" ON public.languages; -- from _v2
DROP POLICY IF EXISTS "languages_are_publicly_readable" ON public.languages; -- from original

CREATE POLICY "languages_are_publicly_readable_for_all_roles" ON public.languages
  FOR SELECT
  USING (true); -- This allows 'anon' and all types of 'authenticated' users to read.
COMMENT ON POLICY "languages_are_publicly_readable_for_all_roles" ON public.languages IS 'All roles (anon, authenticated) can read from the languages table.';

-- The "languages_admin_management" policy (FOR ALL TO authenticated USING role=ADMIN) will still exist.
-- This WILL re-introduce the "multiple_permissive_policies" warning for `languages` for `authenticated SELECT`,
-- because an authenticated ADMIN will match both this new public read policy and their FOR ALL management policy.
-- However, it should fix your immediate "Error fetching language ID" error.

-- If the `FOR INSERT, UPDATE, DELETE` syntax was the true blocker, and you *must* use `FOR ALL` for admin management,
-- then the previous "mutually exclusive USING clause" approach was logically correct but the linter didn't like it.
-- The above `languages_are_publicly_readable_for_all_roles` is the simplest way to ensure reads, at the cost of a linter warning.

COMMIT;