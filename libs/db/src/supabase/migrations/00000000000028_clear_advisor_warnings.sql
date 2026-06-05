-- 00000000000028_clear_advisor_warnings.sql
-- Resolve Supabase Advisor (database linter) warnings without changing application
-- behaviour. Every statement is idempotent and safe to re-run.
--
--   1. 0011 function_search_path_mutable
--      public.handle_ucp_cart_sessions_update() had no pinned search_path.
--   2. 0029 authenticated_security_definer_function_executable
--      public.duplicate_block_definition(uuid) ran as SECURITY DEFINER and was
--      callable by every signed-in user. RLS + per-action grants already enforce
--      ADMIN/WRITER, so it is switched to SECURITY INVOKER (it also keeps its own
--      explicit role check). ADMIN/WRITER behaviour is unchanged.
--   3/4. 0006 multiple_permissive_policies
--      public.categories and public.product_categories each had a FOR ALL
--      "Admin can manage ..." policy that overlapped the "Public can view ..."
--      SELECT policy for the authenticated role. The FOR ALL policy is split into
--      INSERT/UPDATE/DELETE so a SELECT is evaluated against a single permissive
--      policy while admin write access is preserved.
--
-- (The leaked-password and MFA-options advisor items are Auth dashboard settings,
--  not schema, and are intentionally not addressed here.)

-- ---------------------------------------------------------------------------
-- 1. Pin search_path on the UCP cart-session updated_at trigger function.
--    The body only calls now() (pg_catalog, always implicitly searched), so an
--    empty search_path is safe and matches the convention already used by
--    public.is_valid_custom_block_fields (migration 00000000000023).
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.handle_ucp_cart_sessions_update() SET search_path = '';

-- ---------------------------------------------------------------------------
-- 2. duplicate_block_definition: SECURITY DEFINER -> SECURITY INVOKER.
--    The function still raises 42501 for non-ADMIN/WRITER callers, and the
--    underlying SELECT/INSERT are already gated by custom_block_definitions RLS
--    plus the authenticated SELECT/INSERT grants, so the function no longer needs
--    to run with the definer's elevated privileges.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.duplicate_block_definition(uuid) SECURITY INVOKER;

-- ---------------------------------------------------------------------------
-- 3. categories: split the FOR ALL admin policy so SELECT has one permissive
--    policy (the public-read policy). Admin reads still flow through that policy
--    (USING true); admin writes are preserved via the per-action policies below.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;

DROP POLICY IF EXISTS "Admin can insert categories" ON public.categories;
CREATE POLICY "Admin can insert categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()) IS TRUE);

DROP POLICY IF EXISTS "Admin can update categories" ON public.categories;
CREATE POLICY "Admin can update categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()) IS TRUE)
  WITH CHECK ((SELECT public.is_admin()) IS TRUE);

DROP POLICY IF EXISTS "Admin can delete categories" ON public.categories;
CREATE POLICY "Admin can delete categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()) IS TRUE);

-- ---------------------------------------------------------------------------
-- 4. product_categories: same split as categories.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage product_categories" ON public.product_categories;

DROP POLICY IF EXISTS "Admin can insert product_categories" ON public.product_categories;
CREATE POLICY "Admin can insert product_categories"
  ON public.product_categories
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()) IS TRUE);

DROP POLICY IF EXISTS "Admin can update product_categories" ON public.product_categories;
CREATE POLICY "Admin can update product_categories"
  ON public.product_categories
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()) IS TRUE)
  WITH CHECK ((SELECT public.is_admin()) IS TRUE);

DROP POLICY IF EXISTS "Admin can delete product_categories" ON public.product_categories;
CREATE POLICY "Admin can delete product_categories"
  ON public.product_categories
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()) IS TRUE);
