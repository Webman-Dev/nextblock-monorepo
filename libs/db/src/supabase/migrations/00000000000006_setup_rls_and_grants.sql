-- 00000000000006_setup_rls_and_grants.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000018_setup_core_cms_rls.sql
-- RLS, grants, and core admin/public access policies.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_read_policy
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY profiles_service_role_policy
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY profiles_update_policy
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

CREATE POLICY profiles_insert_policy
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY "Users can manage own addresses"
  ON public.user_addresses
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role manages all addresses"
  ON public.user_addresses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY languages_read_policy
  ON public.languages
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY languages_insert_policy
  ON public.languages
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY languages_update_policy
  ON public.languages
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN')
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY languages_delete_policy
  ON public.languages
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY media_read_policy
  ON public.media
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY media_insert_policy
  ON public.media
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY media_update_policy
  ON public.media
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY media_delete_policy
  ON public.media
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY media_service_role_policy
  ON public.media
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY site_settings_read_policy
  ON public.site_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY site_settings_insert_policy
  ON public.site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY site_settings_update_policy
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY site_settings_delete_policy
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY translations_read_policy
  ON public.translations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY translations_insert_policy
  ON public.translations
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY translations_update_policy
  ON public.translations
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY translations_delete_policy
  ON public.translations
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY logos_read_policy
  ON public.logos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY logos_insert_policy
  ON public.logos
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY logos_update_policy
  ON public.logos
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN')
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY logos_delete_policy
  ON public.logos
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN');

-- 00000000000019_setup_content_rls.sql
-- RLS policies for authoring and published content access.

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY pages_anon_read_policy
  ON public.pages
  FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY pages_read_policy
  ON public.pages
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published')
    OR (author_id = (SELECT auth.uid()) AND status <> 'published')
    OR ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  );

CREATE POLICY pages_insert_policy
  ON public.pages
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY pages_update_policy
  ON public.pages
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY pages_delete_policy
  ON public.pages
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY posts_anon_read_policy
  ON public.posts
  FOR SELECT
  TO anon
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

CREATE POLICY posts_read_policy
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

CREATE POLICY posts_insert_policy
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY posts_update_policy
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY posts_delete_policy
  ON public.posts
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY blocks_anon_read_policy
  ON public.blocks
  FOR SELECT
  TO anon
  USING (
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
  );

CREATE POLICY blocks_read_policy
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

CREATE POLICY blocks_insert_policy
  ON public.blocks
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY blocks_update_policy
  ON public.blocks
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY blocks_delete_policy
  ON public.blocks
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY navigation_read_policy
  ON public.navigation_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY navigation_items_insert_policy
  ON public.navigation_items
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY navigation_items_update_policy
  ON public.navigation_items
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN')
  WITH CHECK ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY navigation_items_delete_policy
  ON public.navigation_items
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN');

CREATE POLICY page_revisions_read_policy
  ON public.page_revisions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY page_revisions_insert_policy
  ON public.page_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY page_revisions_update_policy
  ON public.page_revisions
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY page_revisions_delete_policy
  ON public.page_revisions
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY post_revisions_read_policy
  ON public.post_revisions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY post_revisions_insert_policy
  ON public.post_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY post_revisions_update_policy
  ON public.post_revisions
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

CREATE POLICY post_revisions_delete_policy
  ON public.post_revisions
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

-- 00000000000020_setup_commerce_and_financial_rls.sql
-- Consolidated RLS for commerce, licensing, shipping, tax, and currency tables.

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_attribute_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freemius_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freemius_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zone_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zone_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view products"
  ON public.products
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY products_insert_policy
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY products_update_policy
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY products_delete_policy
  ON public.products
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Public can view product media"
  ON public.product_media
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY product_media_insert_policy
  ON public.product_media
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_media_update_policy
  ON public.product_media
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_media_delete_policy
  ON public.product_media
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Public read product_attributes"
  ON public.product_attributes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY product_attributes_insert_policy
  ON public.product_attributes
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_attributes_update_policy
  ON public.product_attributes
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_attributes_delete_policy
  ON public.product_attributes
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Public read product_attribute_terms"
  ON public.product_attribute_terms
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY product_attribute_terms_insert_policy
  ON public.product_attribute_terms
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_attribute_terms_update_policy
  ON public.product_attribute_terms
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_attribute_terms_delete_policy
  ON public.product_attribute_terms
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Public read product_variants"
  ON public.product_variants
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY product_variants_insert_policy
  ON public.product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_variants_update_policy
  ON public.product_variants
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_variants_delete_policy
  ON public.product_variants
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Public read variant_attribute_mapping"
  ON public.variant_attribute_mapping
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY variant_attribute_mapping_insert_policy
  ON public.variant_attribute_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY variant_attribute_mapping_update_policy
  ON public.variant_attribute_mapping
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY variant_attribute_mapping_delete_policy
  ON public.variant_attribute_mapping
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.is_admin()) IS TRUE)
    OR (user_id = (SELECT auth.uid()))
  );

CREATE POLICY orders_insert_policy
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY orders_update_policy
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY orders_delete_policy
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Service Role manages orders"
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

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

CREATE POLICY order_items_insert_policy
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY order_items_update_policy
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY order_items_delete_policy
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Service Role manages order items"
  ON public.order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access"
  ON public.package_activations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read access"
  ON public.package_activations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public read access for freemius_plans"
  ON public.freemius_plans
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for freemius_pricing"
  ON public.freemius_pricing
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view inventory items"
  ON public.inventory_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY inventory_items_insert_policy
  ON public.inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY inventory_items_update_policy
  ON public.inventory_items
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY inventory_items_delete_policy
  ON public.inventory_items
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Service Role manages inventory items"
  ON public.inventory_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read shipping_zones"
  ON public.shipping_zones
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY shipping_zones_insert_policy
  ON public.shipping_zones
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY shipping_zones_update_policy
  ON public.shipping_zones
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY shipping_zones_delete_policy
  ON public.shipping_zones
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Public read shipping_zone_locations"
  ON public.shipping_zone_locations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY shipping_zone_locations_insert_policy
  ON public.shipping_zone_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY shipping_zone_locations_update_policy
  ON public.shipping_zone_locations
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY shipping_zone_locations_delete_policy
  ON public.shipping_zone_locations
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Public read shipping_zone_methods"
  ON public.shipping_zone_methods
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY shipping_zone_methods_insert_policy
  ON public.shipping_zone_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY shipping_zone_methods_update_policy
  ON public.shipping_zone_methods
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY shipping_zone_methods_delete_policy
  ON public.shipping_zone_methods
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Public read tax_rates"
  ON public.tax_rates
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY tax_rates_insert_policy
  ON public.tax_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY tax_rates_update_policy
  ON public.tax_rates
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY tax_rates_delete_policy
  ON public.tax_rates
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Service Role manages tax_rates"
  ON public.tax_rates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read active currencies"
  ON public.currencies
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY currencies_insert_policy
  ON public.currencies
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY currencies_update_policy
  ON public.currencies
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY currencies_delete_policy
  ON public.currencies
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Service role manages currencies"
  ON public.currencies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
