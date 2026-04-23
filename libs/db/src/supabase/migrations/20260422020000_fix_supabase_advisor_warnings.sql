-- 20260422020000_fix_supabase_advisor_warnings.sql
-- Resolves repo-addressable Supabase advisor warnings around mutable function
-- search_path values and overlapping or unoptimized RLS policies.

BEGIN;

-- 1. Harden warned functions with an explicit search_path.
ALTER FUNCTION public.get_my_claim(text) SET search_path = '';
ALTER FUNCTION public.handle_languages_update() SET search_path = '';
ALTER FUNCTION public.set_current_timestamp_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_shipping_zone_locations_write() SET search_path = '';
ALTER FUNCTION public.handle_tax_rates_write() SET search_path = '';
ALTER FUNCTION public.format_order_invoice_number(bigint) SET search_path = '';
ALTER FUNCTION public.generate_order_invoice_number() SET search_path = '';
ALTER FUNCTION public.get_default_currency_code() SET search_path = '';
ALTER FUNCTION public.normalize_currency_amount_map(jsonb) SET search_path = '';
ALTER FUNCTION public.is_valid_currency_amount_map(jsonb) SET search_path = '';
ALTER FUNCTION public.is_valid_sale_price_map(jsonb, jsonb) SET search_path = '';
ALTER FUNCTION public.sync_currency_price_maps() SET search_path = '';
ALTER FUNCTION public.handle_default_currency_change() SET search_path = '';
ALTER FUNCTION public.sync_legacy_price_columns_for_currency(text) SET search_path = '';
ALTER FUNCTION public.set_currency_defaults() SET search_path = '';
ALTER FUNCTION public.clear_currency_price_overrides(text) SET search_path = '';
ALTER FUNCTION public.sync_shipping_method_currency_maps() SET search_path = '';

-- 2. Replace direct auth.uid() calls in the warned policies with scalar
-- subselects so the result is initialized once per statement.
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.user_addresses;
CREATE POLICY "Users can manage own addresses"
  ON public.user_addresses
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (id = (SELECT auth.uid()))
    OR ((SELECT public.get_current_user_role()) = 'ADMIN')
  )
  WITH CHECK (
    (id = (SELECT auth.uid()))
    OR ((SELECT public.get_current_user_role()) = 'ADMIN')
  );

-- 3. Consolidate authenticated SELECT access for content tables and split the
-- prior FOR ALL policies into explicit write policies.
DROP POLICY IF EXISTS "pages_read_policy" ON public.pages;
DROP POLICY IF EXISTS "pages_manage_policy" ON public.pages;
DROP POLICY IF EXISTS "pages_insert_policy" ON public.pages;
DROP POLICY IF EXISTS "pages_update_policy" ON public.pages;
DROP POLICY IF EXISTS "pages_delete_policy" ON public.pages;

CREATE POLICY "pages_read_policy"
  ON public.pages
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published')
    OR (author_id = (SELECT auth.uid()) AND status <> 'published')
    OR ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  );

CREATE POLICY "pages_insert_policy"
  ON public.pages
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY "pages_update_policy"
  ON public.pages
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY "pages_delete_policy"
  ON public.pages
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

DROP POLICY IF EXISTS "posts_read_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_manage_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_update_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_policy" ON public.posts;

CREATE POLICY "posts_read_policy"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    (
      status = 'published'
      AND (published_at IS NULL OR published_at <= now())
    )
    OR (author_id = (SELECT auth.uid()) AND status <> 'published')
    OR ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  );

CREATE POLICY "posts_insert_policy"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY "posts_update_policy"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY "posts_delete_policy"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

DROP POLICY IF EXISTS "blocks_read_policy" ON public.blocks;
DROP POLICY IF EXISTS "blocks_manage_policy" ON public.blocks;
DROP POLICY IF EXISTS "blocks_insert_policy" ON public.blocks;
DROP POLICY IF EXISTS "blocks_update_policy" ON public.blocks;
DROP POLICY IF EXISTS "blocks_delete_policy" ON public.blocks;

CREATE POLICY "blocks_read_policy"
  ON public.blocks
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
    OR (
      (
        page_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.pages AS p
          WHERE p.id = blocks.page_id
            AND p.status = 'published'
        )
      )
      OR (
        post_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.posts AS pt
          WHERE pt.id = blocks.post_id
            AND pt.status = 'published'
            AND (pt.published_at IS NULL OR pt.published_at <= now())
        )
      )
    )
  );

CREATE POLICY "blocks_insert_policy"
  ON public.blocks
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY "blocks_update_policy"
  ON public.blocks
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY "blocks_delete_policy"
  ON public.blocks
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

-- 4. Split public-readable admin/editor management policies into explicit
-- write-only policies so authenticated SELECT access is not duplicated.
DO $$
DECLARE
  entry record;
BEGIN
  FOR entry IN
    SELECT *
    FROM (
      VALUES
        ('languages', 'languages_manage_policy', '(SELECT public.get_current_user_role()) = ''ADMIN'''),
        ('logos', 'logos_manage_policy', '(SELECT public.get_current_user_role()) = ''ADMIN'''),
        ('navigation_items', 'navigation_manage_policy', '(SELECT public.get_current_user_role()) = ''ADMIN'''),
        ('media', 'media_manage_policy', '(SELECT public.get_current_user_role()) IN (''ADMIN'', ''WRITER'')'),
        ('site_settings', 'site_settings_manage_policy', '(SELECT public.get_current_user_role()) IN (''ADMIN'', ''WRITER'')'),
        ('translations', 'translations_manage_policy', '(SELECT public.get_current_user_role()) IN (''ADMIN'', ''WRITER'')'),
        ('page_revisions', 'page_revisions_manage_policy', '(SELECT public.get_current_user_role()) IN (''ADMIN'', ''WRITER'')'),
        ('post_revisions', 'post_revisions_manage_policy', '(SELECT public.get_current_user_role()) IN (''ADMIN'', ''WRITER'')'),
        ('currencies', 'Admins manage currencies', '((SELECT public.is_admin()) IS TRUE)'),
        ('inventory_items', 'Admins can manage inventory items', '((SELECT public.is_admin()) IS TRUE)'),
        ('product_attributes', 'Admins manage product_attributes', '((SELECT public.is_admin()) IS TRUE)'),
        ('product_attribute_terms', 'Admins manage product_attribute_terms', '((SELECT public.is_admin()) IS TRUE)'),
        ('product_media', 'Admins can manage product media', '((SELECT public.is_admin()) IS TRUE)'),
        ('product_variants', 'Admins manage product_variants', '((SELECT public.is_admin()) IS TRUE)'),
        ('products', 'Admins can manage products', '((SELECT public.is_admin()) IS TRUE)'),
        ('shipping_zone_locations', 'Admins manage shipping_zone_locations', '((SELECT public.is_admin()) IS TRUE)'),
        ('shipping_zone_methods', 'Admins manage shipping_zone_methods', '((SELECT public.is_admin()) IS TRUE)'),
        ('shipping_zones', 'Admins manage shipping_zones', '((SELECT public.is_admin()) IS TRUE)'),
        ('tax_rates', 'Admins manage tax_rates', '((SELECT public.is_admin()) IS TRUE)'),
        ('variant_attribute_mapping', 'Admins manage variant_attribute_mapping', '((SELECT public.is_admin()) IS TRUE)')
    ) AS policies(table_name, old_policy_name, role_check)
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      entry.old_policy_name,
      entry.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      entry.table_name || '_insert_policy',
      entry.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      entry.table_name || '_update_policy',
      entry.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      entry.table_name || '_delete_policy',
      entry.table_name
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      entry.table_name || '_insert_policy',
      entry.table_name,
      entry.role_check
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      entry.table_name || '_update_policy',
      entry.table_name,
      entry.role_check,
      entry.role_check
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
      entry.table_name || '_delete_policy',
      entry.table_name,
      entry.role_check
    );
  END LOOP;
END $$;

-- 5. Collapse orders and order_items authenticated SELECT access to a single
-- policy each, while keeping admin writes explicit.
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.is_admin()) IS TRUE)
    OR (user_id = (SELECT auth.uid()))
  );

CREATE POLICY "orders_insert_policy"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()) IS TRUE);

CREATE POLICY "orders_update_policy"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()) IS TRUE)
  WITH CHECK ((SELECT public.is_admin()) IS TRUE);

CREATE POLICY "orders_delete_policy"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()) IS TRUE);

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_policy" ON public.order_items;

CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.is_admin()) IS TRUE)
    OR EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "order_items_insert_policy"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()) IS TRUE);

CREATE POLICY "order_items_update_policy"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()) IS TRUE)
  WITH CHECK ((SELECT public.is_admin()) IS TRUE);

CREATE POLICY "order_items_delete_policy"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()) IS TRUE);

COMMIT;
