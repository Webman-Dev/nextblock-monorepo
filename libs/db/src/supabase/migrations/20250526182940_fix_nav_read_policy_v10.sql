-- supabase/migrations/YYYYMMDDHHMMSS_fix_nav_read_policy_v10.sql

BEGIN;

-- == NAVIGATION ITEMS ==

-- Drop the existing SELECT policy for authenticated non-admins, as we'll replace it with a broader one.
DROP POLICY IF EXISTS "nav_items_authenticated_non_admin_can_read" ON public.navigation_items;
-- Also drop older name if it somehow exists from v5 attempt
DROP POLICY IF EXISTS "nav_items_user_can_read" ON public.navigation_items;


-- Create a policy that allows ALL authenticated users to read navigation items.
-- This will cover USER, WRITER, and ADMIN roles for SELECT.
CREATE POLICY "nav_items_authenticated_can_read" ON public.navigation_items
  FOR SELECT
  TO authenticated
  USING (true); -- Any authenticated user can read all navigation items.
COMMENT ON POLICY "nav_items_authenticated_can_read" ON public.navigation_items IS 'All authenticated users (USER, WRITER, ADMIN) can read navigation items.';

-- The following policies are assumed to be correctly in place and should remain:
-- 1. "nav_items_anon_can_read" ON public.navigation_items FOR SELECT TO anon USING (true);
-- 2. "nav_items_admin_can_insert" ON public.navigation_items FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() = 'ADMIN');
-- 3. "nav_items_admin_can_update" ON public.navigation_items FOR UPDATE TO authenticated USING (public.get_current_user_role() = 'ADMIN') WITH CHECK (public.get_current_user_role() = 'ADMIN');
-- 4. "nav_items_admin_can_delete" ON public.navigation_items FOR DELETE TO authenticated USING (public.get_current_user_role() = 'ADMIN');

COMMIT;