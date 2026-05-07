-- 00000000000012_setup_commerce_coupons.sql
-- Unified commerce coupons for Stripe and Freemius checkout.

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  internal_note text,
  provider_scope text NOT NULL DEFAULT 'all',
  discount_type text NOT NULL,
  discount_amount integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  redemption_limit integer,
  redemptions_count integer NOT NULL DEFAULT 0,
  freemius_sync_status text NOT NULL DEFAULT 'not_synced',
  freemius_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_code_not_blank CHECK (char_length(btrim(code)) > 0),
  CONSTRAINT coupons_name_not_blank CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT coupons_provider_scope_valid
    CHECK (provider_scope IN ('all', 'stripe', 'freemius')),
  CONSTRAINT coupons_discount_type_valid
    CHECK (discount_type IN ('percent', 'fixed')),
  CONSTRAINT coupons_discount_amount_positive
    CHECK (discount_amount > 0),
  CONSTRAINT coupons_percent_amount_valid
    CHECK (discount_type <> 'percent' OR discount_amount <= 100),
  CONSTRAINT coupons_redemption_limit_positive
    CHECK (redemption_limit IS NULL OR redemption_limit > 0),
  CONSTRAINT coupons_redemptions_count_nonnegative
    CHECK (redemptions_count >= 0),
  CONSTRAINT coupons_date_window_valid
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  CONSTRAINT coupons_freemius_sync_status_valid
    CHECK (freemius_sync_status IN ('not_synced', 'pending', 'synced', 'failed', 'not_required'))
);

CREATE UNIQUE INDEX coupons_code_unique
  ON public.coupons (upper(code));

COMMENT ON TABLE public.coupons IS
  'Unified commerce coupons managed by NextBlock CMS and applied through provider-aware checkout.';
COMMENT ON COLUMN public.coupons.provider_scope IS
  'Provider eligibility: all, stripe, or freemius.';
COMMENT ON COLUMN public.coupons.discount_amount IS
  'Percent value for percent coupons, or fixed minor-unit amount for fixed coupons.';
COMMENT ON COLUMN public.coupons.freemius_sync_status IS
  'Aggregate status for syncing this coupon to Freemius product coupon records.';

CREATE TABLE public.coupon_products (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, product_id)
);

COMMENT ON TABLE public.coupon_products IS
  'Optional product allow-list for coupons. No rows means all products in the provider scope are eligible.';

CREATE TABLE public.coupon_freemius_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  freemius_product_id text NOT NULL,
  freemius_coupon_id text,
  freemius_coupon_code text NOT NULL,
  sync_status text NOT NULL DEFAULT 'pending',
  sync_error text,
  remote_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_freemius_mappings_product_not_blank
    CHECK (char_length(btrim(freemius_product_id)) > 0),
  CONSTRAINT coupon_freemius_mappings_code_not_blank
    CHECK (char_length(btrim(freemius_coupon_code)) > 0),
  CONSTRAINT coupon_freemius_mappings_sync_status_valid
    CHECK (sync_status IN ('pending', 'synced', 'failed', 'deleted'))
);

CREATE UNIQUE INDEX coupon_freemius_mappings_coupon_product_unique
  ON public.coupon_freemius_mappings (coupon_id, freemius_product_id);

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  coupon_code text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('stripe', 'freemius')),
  discount_total integer NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_redemptions_code_not_blank CHECK (char_length(btrim(coupon_code)) > 0)
);

CREATE UNIQUE INDEX coupon_redemptions_order_unique
  ON public.coupon_redemptions (order_id)
  WHERE order_id IS NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_total integer NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  ADD COLUMN discount_details jsonb;

COMMENT ON COLUMN public.orders.coupon_code IS
  'Coupon code applied to the order at checkout time.';
COMMENT ON COLUMN public.orders.discount_total IS
  'Total discount applied to this order in the smallest currency unit.';
COMMENT ON COLUMN public.orders.discount_details IS
  'Provider-aware coupon quote details captured at checkout.';

CREATE OR REPLACE FUNCTION public.handle_coupons_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.code := upper(regexp_replace(btrim(NEW.code), '\s+', '', 'g'));
  NEW.name := btrim(NEW.name);
  NEW.provider_scope := lower(btrim(NEW.provider_scope));
  NEW.discount_type := lower(btrim(NEW.discount_type));
  NEW.freemius_sync_status := lower(btrim(COALESCE(NEW.freemius_sync_status, 'not_synced')));
  NEW.updated_at := now();

  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_coupon_freemius_mappings_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.freemius_product_id := btrim(NEW.freemius_product_id);
  NEW.freemius_coupon_code := upper(regexp_replace(btrim(NEW.freemius_coupon_code), '\s+', '', 'g'));
  NEW.sync_status := lower(btrim(COALESCE(NEW.sync_status, 'pending')));
  NEW.updated_at := now();

  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_coupons_write ON public.coupons;
CREATE TRIGGER on_coupons_write
  BEFORE INSERT OR UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coupons_write();

DROP TRIGGER IF EXISTS on_coupon_freemius_mappings_write ON public.coupon_freemius_mappings;
CREATE TRIGGER on_coupon_freemius_mappings_write
  BEFORE INSERT OR UPDATE ON public.coupon_freemius_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coupon_freemius_mappings_write();

CREATE INDEX idx_coupons_active_dates
  ON public.coupons (is_active, starts_at, ends_at);

CREATE INDEX idx_coupon_products_product_id
  ON public.coupon_products (product_id);

CREATE INDEX idx_coupon_freemius_mappings_product_id
  ON public.coupon_freemius_mappings (product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX idx_coupon_freemius_mappings_freemius_product_id
  ON public.coupon_freemius_mappings (freemius_product_id);

CREATE INDEX idx_coupon_redemptions_coupon_id
  ON public.coupon_redemptions (coupon_id);

CREATE INDEX idx_coupon_redemptions_user_id
  ON public.coupon_redemptions (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_orders_coupon_id
  ON public.orders (coupon_id)
  WHERE coupon_id IS NOT NULL;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_freemius_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.coupons TO authenticated, service_role;
GRANT ALL ON public.coupon_products TO authenticated, service_role;
GRANT ALL ON public.coupon_freemius_mappings TO authenticated, service_role;
GRANT ALL ON public.coupon_redemptions TO authenticated, service_role;

CREATE POLICY coupons_admin_select_policy
  ON public.coupons
  FOR SELECT
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY coupons_admin_insert_policy
  ON public.coupons
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY coupons_admin_update_policy
  ON public.coupons
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY coupons_admin_delete_policy
  ON public.coupons
  FOR DELETE
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY coupons_service_role_policy
  ON public.coupons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY coupon_products_admin_policy
  ON public.coupon_products
  FOR ALL
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY coupon_products_service_role_policy
  ON public.coupon_products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY coupon_freemius_mappings_admin_policy
  ON public.coupon_freemius_mappings
  FOR ALL
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY coupon_freemius_mappings_service_role_policy
  ON public.coupon_freemius_mappings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY coupon_redemptions_admin_select_policy
  ON public.coupon_redemptions
  FOR SELECT
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY coupon_redemptions_service_role_policy
  ON public.coupon_redemptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
