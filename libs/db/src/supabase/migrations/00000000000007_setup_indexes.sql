-- 00000000000007_setup_indexes.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000021_setup_cms_indexes.sql
-- Supporting indexes for accounts, content, and revisions.

CREATE INDEX idx_user_addresses_user_id
  ON public.user_addresses (user_id);

CREATE INDEX idx_user_addresses_type
  ON public.user_addresses (address_type);

CREATE INDEX idx_media_uploader_id
  ON public.media (uploader_id);

CREATE INDEX media_folder_idx
  ON public.media (folder);

CREATE INDEX idx_posts_feature_image_id
  ON public.posts (feature_image_id);

CREATE INDEX idx_posts_author_id
  ON public.posts (author_id);

CREATE INDEX idx_posts_translation_group_id
  ON public.posts (translation_group_id);

CREATE INDEX idx_pages_author_id
  ON public.pages (author_id);

CREATE INDEX idx_pages_translation_group_id
  ON public.pages (translation_group_id);

CREATE INDEX idx_blocks_language_id
  ON public.blocks (language_id);

CREATE INDEX idx_blocks_page_id
  ON public.blocks (page_id);

CREATE INDEX idx_blocks_post_id
  ON public.blocks (post_id);

CREATE INDEX idx_navigation_items_menu_lang_order
  ON public.navigation_items (menu_key, language_id, "order");

CREATE INDEX idx_navigation_items_language_id
  ON public.navigation_items (language_id);

CREATE INDEX idx_navigation_items_page_id
  ON public.navigation_items (page_id);

CREATE INDEX idx_navigation_items_parent_id
  ON public.navigation_items (parent_id);

CREATE INDEX idx_logos_media_id
  ON public.logos (media_id);

CREATE INDEX idx_page_revisions_page_id_version
  ON public.page_revisions (page_id, version);

CREATE INDEX idx_page_revisions_author_id
  ON public.page_revisions (author_id);

CREATE INDEX idx_post_revisions_post_id_version
  ON public.post_revisions (post_id, version);

CREATE INDEX idx_post_revisions_author_id
  ON public.post_revisions (author_id);

-- 00000000000022_setup_commerce_indexes.sql
-- Consolidated commerce, shipping, and financial indexes.

CREATE INDEX idx_products_slug
  ON public.products (slug);

CREATE INDEX idx_products_translation_group_id
  ON public.products (translation_group_id);

CREATE INDEX idx_products_prices_gin
  ON public.products
  USING gin (prices jsonb_path_ops);

CREATE INDEX idx_product_media_product_id
  ON public.product_media (product_id);

CREATE INDEX idx_product_media_media_id
  ON public.product_media (media_id);

CREATE INDEX idx_order_items_order_id
  ON public.order_items (order_id);

CREATE INDEX idx_order_items_variant_id
  ON public.order_items (variant_id);

CREATE INDEX idx_order_items_product_id
  ON public.order_items (product_id);

CREATE INDEX idx_orders_user_id
  ON public.orders (user_id);

CREATE INDEX idx_package_activations_package_id
  ON public.package_activations (package_id);

CREATE INDEX idx_package_activations_license_key
  ON public.package_activations (license_key);

CREATE INDEX idx_freemius_plans_product_id
  ON public.freemius_plans (product_id);

CREATE INDEX idx_freemius_pricing_plan_id
  ON public.freemius_pricing (plan_id);

CREATE INDEX idx_product_attribute_terms_attribute_id
  ON public.product_attribute_terms (attribute_id);

CREATE INDEX idx_product_variants_product_id
  ON public.product_variants (product_id);

CREATE INDEX idx_product_variants_main_media_id
  ON public.product_variants (main_media_id);

CREATE INDEX idx_product_variants_prices_gin
  ON public.product_variants
  USING gin (prices jsonb_path_ops);

CREATE INDEX idx_variant_attribute_mapping_attribute_term_id
  ON public.variant_attribute_mapping (attribute_term_id);

CREATE INDEX idx_inventory_items_updated_at
  ON public.inventory_items (updated_at DESC);

CREATE INDEX idx_shipping_zone_locations_zone_id
  ON public.shipping_zone_locations (zone_id);

CREATE INDEX idx_shipping_zone_locations_country_state_postal
  ON public.shipping_zone_locations (country_code, state_code, postal_code);

CREATE INDEX idx_shipping_zone_methods_name_translations
  ON public.shipping_zone_methods
  USING gin (name_translations);

CREATE INDEX idx_shipping_zone_methods_zone_id
  ON public.shipping_zone_methods (zone_id);

CREATE INDEX idx_tax_rates_country_state
  ON public.tax_rates (country_code, state_code);
