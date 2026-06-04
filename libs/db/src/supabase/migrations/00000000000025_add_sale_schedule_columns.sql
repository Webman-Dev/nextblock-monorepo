-- 00000000000025_add_sale_schedule_columns.sql
-- Scheduled pricing for products and variants:
--   * sale_start_at / sale_end_at gate the existing sale_price / sale_prices into a time window.
--   * scheduled_price / scheduled_prices / scheduled_price_at hold a pending permanent
--     regular-price change that takes effect once scheduled_price_at has passed.
-- Enforcement is read-time (see resolveEffectivePriceForCurrency); no cron is required.
-- Also adds a mapping table for auto-generated, time-bounded Freemius sale coupons.

-- ---------------------------------------------------------------------------
-- 1. Schedule columns on products
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS sale_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_price integer,
  ADD COLUMN IF NOT EXISTS scheduled_prices jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_price_at timestamptz;

ALTER TABLE public.products
  ADD CONSTRAINT products_sale_window_valid
    CHECK (sale_start_at IS NULL OR sale_end_at IS NULL OR sale_start_at < sale_end_at);

COMMENT ON COLUMN public.products.sale_start_at IS
  'Inclusive start of the scheduled sale window (UTC). NULL means no lower bound.';
COMMENT ON COLUMN public.products.sale_end_at IS
  'Exclusive end of the scheduled sale window (UTC). NULL means no upper bound. Both NULL = always-on sale.';
COMMENT ON COLUMN public.products.scheduled_price IS
  'Pending regular price (smallest currency unit) applied once scheduled_price_at has passed.';
COMMENT ON COLUMN public.products.scheduled_prices IS
  'Pending multi-currency regular prices by ISO 4217 code, applied once scheduled_price_at has passed.';
COMMENT ON COLUMN public.products.scheduled_price_at IS
  'Effective timestamp (UTC) for the pending regular-price change.';

CREATE INDEX IF NOT EXISTS products_sale_window_idx
  ON public.products (sale_start_at, sale_end_at)
  WHERE sale_start_at IS NOT NULL OR sale_end_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_scheduled_price_idx
  ON public.products (scheduled_price_at)
  WHERE scheduled_price_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Schedule columns on product_variants
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS sale_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS sale_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_price integer,
  ADD COLUMN IF NOT EXISTS scheduled_prices jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_price_at timestamptz;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_sale_window_valid
    CHECK (sale_start_at IS NULL OR sale_end_at IS NULL OR sale_start_at < sale_end_at);

COMMENT ON COLUMN public.product_variants.sale_start_at IS
  'Inclusive start of the scheduled sale window (UTC) for this variant. NULL means no lower bound.';
COMMENT ON COLUMN public.product_variants.sale_end_at IS
  'Exclusive end of the scheduled sale window (UTC) for this variant. NULL means no upper bound.';
COMMENT ON COLUMN public.product_variants.scheduled_price IS
  'Pending regular price (smallest currency unit) applied once scheduled_price_at has passed.';
COMMENT ON COLUMN public.product_variants.scheduled_prices IS
  'Pending multi-currency regular prices by ISO 4217 code, applied once scheduled_price_at has passed.';
COMMENT ON COLUMN public.product_variants.scheduled_price_at IS
  'Effective timestamp (UTC) for the pending regular-price change.';

CREATE INDEX IF NOT EXISTS product_variants_sale_window_idx
  ON public.product_variants (sale_start_at, sale_end_at)
  WHERE sale_start_at IS NOT NULL OR sale_end_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_variants_scheduled_price_idx
  ON public.product_variants (scheduled_price_at)
  WHERE scheduled_price_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Redefine upsert_product_with_variants to persist the sale-window columns.
--    The form write path goes exclusively through this RPC; the scheduled_price*
--    columns are written by the bulk importer via direct service-role UPDATE and
--    therefore are intentionally NOT part of this function.
--    Body copied from migration 00000000000005 with sale_start_at / sale_end_at added.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_product_with_variants(product_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_product_id uuid := NULLIF(product_payload->>'id', '')::uuid;
  v_translation_group_id uuid := NULLIF(product_payload->>'translation_group_id', '')::uuid;
  v_product_type text := CASE
    WHEN product_payload->>'product_type' IN ('physical', 'digital') THEN
      product_payload->>'product_type'
    WHEN NULLIF(product_payload->>'freemius_product_id', '') IS NOT NULL
      OR NULLIF(product_payload->>'freemius_plan_id', '') IS NOT NULL THEN
      'digital'
    ELSE
      'physical'
  END;
  v_payment_provider text := CASE
    WHEN v_product_type = 'digital' THEN 'freemius'
    ELSE 'stripe'
  END;
  v_variants jsonb := COALESCE(product_payload->'variants', '[]'::jsonb);
  v_variant jsonb;
  v_variant_id uuid;
  v_term_id text;
  v_has_variants boolean := jsonb_typeof(v_variants) = 'array' AND jsonb_array_length(v_variants) > 0;
  v_total_variant_stock integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF v_has_variants THEN
    SELECT COALESCE(SUM(COALESCE((value->>'stock_quantity')::integer, 0)), 0)
      INTO v_total_variant_stock
    FROM jsonb_array_elements(v_variants);
  END IF;

  IF v_product_id IS NULL THEN
    INSERT INTO public.products (
      title,
      slug,
      sku,
      product_type,
      payment_provider,
      upc,
      stock,
      status,
      short_description,
      description_json,
      metadata,
      price,
      prices,
      sale_price,
      sale_prices,
      sale_start_at,
      sale_end_at,
      freemius_plan_id,
      freemius_product_id,
      trial_period_days,
      trial_requires_payment_method,
      language_id,
      translation_group_id
    )
    VALUES (
      product_payload->>'title',
      product_payload->>'slug',
      product_payload->>'sku',
      v_product_type,
      v_payment_provider,
      NULLIF(product_payload->>'upc', ''),
      CASE
        WHEN v_has_variants THEN v_total_variant_stock
        ELSE COALESCE((product_payload->>'stock')::integer, 0)
      END,
      COALESCE(product_payload->>'status', 'draft'),
      NULLIF(product_payload->>'short_description', ''),
      product_payload->'description_json',
      COALESCE(product_payload->'metadata', '{}'::jsonb),
      COALESCE((product_payload->>'price')::integer, 0),
      COALESCE(product_payload->'prices', '{}'::jsonb),
      CASE
        WHEN product_payload ? 'sale_price' AND product_payload->>'sale_price' <> '' THEN
          (product_payload->>'sale_price')::integer
        ELSE
          NULL
      END,
      CASE
        WHEN product_payload ? 'sale_prices' THEN COALESCE(product_payload->'sale_prices', '{}'::jsonb)
        ELSE NULL
      END,
      CASE
        WHEN product_payload ? 'sale_start_at' AND product_payload->>'sale_start_at' <> '' THEN
          (product_payload->>'sale_start_at')::timestamptz
        ELSE
          NULL
      END,
      CASE
        WHEN product_payload ? 'sale_end_at' AND product_payload->>'sale_end_at' <> '' THEN
          (product_payload->>'sale_end_at')::timestamptz
        ELSE
          NULL
      END,
      NULLIF(product_payload->>'freemius_plan_id', ''),
      NULLIF(product_payload->>'freemius_product_id', ''),
      COALESCE((product_payload->>'trial_period_days')::integer, 0),
      COALESCE((product_payload->>'trial_requires_payment_method')::boolean, false),
      (product_payload->>'language_id')::bigint,
      COALESCE(v_translation_group_id, gen_random_uuid())
    )
    RETURNING id INTO v_product_id;
  ELSE
    UPDATE public.products
    SET
      title = product_payload->>'title',
      slug = product_payload->>'slug',
      sku = product_payload->>'sku',
      product_type = v_product_type,
      payment_provider = v_payment_provider,
      upc = NULLIF(product_payload->>'upc', ''),
      stock = CASE
        WHEN v_has_variants THEN v_total_variant_stock
        ELSE COALESCE((product_payload->>'stock')::integer, 0)
      END,
      status = COALESCE(product_payload->>'status', status),
      short_description = NULLIF(product_payload->>'short_description', ''),
      description_json = product_payload->'description_json',
      metadata = COALESCE(product_payload->'metadata', '{}'::jsonb),
      price = COALESCE((product_payload->>'price')::integer, 0),
      prices = COALESCE(product_payload->'prices', '{}'::jsonb),
      sale_price = CASE
        WHEN product_payload ? 'sale_price' AND product_payload->>'sale_price' <> '' THEN
          (product_payload->>'sale_price')::integer
        ELSE
          NULL
      END,
      sale_prices = CASE
        WHEN product_payload ? 'sale_prices' THEN COALESCE(product_payload->'sale_prices', '{}'::jsonb)
        ELSE NULL
      END,
      sale_start_at = CASE
        WHEN product_payload ? 'sale_start_at' AND product_payload->>'sale_start_at' <> '' THEN
          (product_payload->>'sale_start_at')::timestamptz
        ELSE
          NULL
      END,
      sale_end_at = CASE
        WHEN product_payload ? 'sale_end_at' AND product_payload->>'sale_end_at' <> '' THEN
          (product_payload->>'sale_end_at')::timestamptz
        ELSE
          NULL
      END,
      freemius_plan_id = NULLIF(product_payload->>'freemius_plan_id', ''),
      freemius_product_id = NULLIF(product_payload->>'freemius_product_id', ''),
      trial_period_days = COALESCE((product_payload->>'trial_period_days')::integer, 0),
      trial_requires_payment_method = COALESCE((product_payload->>'trial_requires_payment_method')::boolean, false),
      language_id = COALESCE((product_payload->>'language_id')::bigint, language_id),
      translation_group_id = COALESCE(v_translation_group_id, translation_group_id),
      updated_at = now()
    WHERE id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found';
    END IF;
  END IF;

  DELETE FROM public.variant_attribute_mapping
  WHERE variant_id IN (
    SELECT id
    FROM public.product_variants
    WHERE product_id = v_product_id
  );

  DELETE FROM public.product_variants
  WHERE product_id = v_product_id;

  IF v_has_variants THEN
    FOR v_variant IN
      SELECT value FROM jsonb_array_elements(v_variants)
    LOOP
      INSERT INTO public.product_variants (
        product_id,
        sku,
        upc,
        price,
        prices,
        sale_price,
        sale_prices,
        sale_start_at,
        sale_end_at,
        stock_quantity,
        main_media_id
      )
      VALUES (
        v_product_id,
        v_variant->>'sku',
        NULLIF(v_variant->>'upc', ''),
        COALESCE((v_variant->>'price')::integer, 0),
        COALESCE(v_variant->'prices', '{}'::jsonb),
        CASE
          WHEN v_variant ? 'sale_price' AND v_variant->>'sale_price' <> '' THEN
            (v_variant->>'sale_price')::integer
          ELSE
            NULL
        END,
        CASE
          WHEN v_variant ? 'sale_prices' THEN COALESCE(v_variant->'sale_prices', '{}'::jsonb)
          ELSE NULL
        END,
        CASE
          WHEN v_variant ? 'sale_start_at' AND v_variant->>'sale_start_at' <> '' THEN
            (v_variant->>'sale_start_at')::timestamptz
          ELSE
            NULL
        END,
        CASE
          WHEN v_variant ? 'sale_end_at' AND v_variant->>'sale_end_at' <> '' THEN
            (v_variant->>'sale_end_at')::timestamptz
          ELSE
            NULL
        END,
        COALESCE((v_variant->>'stock_quantity')::integer, 0),
        NULLIF(v_variant->>'main_media_id', '')::uuid
      )
      RETURNING id INTO v_variant_id;

      FOR v_term_id IN
        SELECT jsonb_array_elements_text(COALESCE(v_variant->'attribute_term_ids', '[]'::jsonb))
      LOOP
        INSERT INTO public.variant_attribute_mapping (variant_id, attribute_term_id)
        VALUES (v_variant_id, v_term_id::uuid);
      END LOOP;
    END LOOP;
  END IF;

  RETURN v_product_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.upsert_product_with_variants(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_product_with_variants(jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Mapping table for auto-generated, time-bounded Freemius sale coupons.
--    One auto-sale coupon per product. Kept separate from the admin `coupons`
--    table so generated sale coupons do not appear in the Coupons UI.
-- ---------------------------------------------------------------------------
CREATE TABLE public.product_freemius_sale_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  freemius_product_id text NOT NULL,
  freemius_plan_id text,
  freemius_coupon_id text,
  freemius_coupon_code text NOT NULL,
  discount_percent integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  sync_status text NOT NULL DEFAULT 'pending',
  sync_error text,
  remote_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_freemius_sale_coupons_product_unique UNIQUE (product_id),
  CONSTRAINT product_freemius_sale_coupons_fm_product_not_blank
    CHECK (char_length(btrim(freemius_product_id)) > 0),
  CONSTRAINT product_freemius_sale_coupons_code_not_blank
    CHECK (char_length(btrim(freemius_coupon_code)) > 0),
  CONSTRAINT product_freemius_sale_coupons_discount_valid
    CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 100)),
  CONSTRAINT product_freemius_sale_coupons_window_valid
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  CONSTRAINT product_freemius_sale_coupons_sync_status_valid
    CHECK (sync_status IN ('pending', 'synced', 'failed', 'deleted'))
);

COMMENT ON TABLE public.product_freemius_sale_coupons IS
  'Auto-generated, time-bounded Freemius coupons that enforce a scheduled sale on a Freemius product at Freemius-hosted checkout.';

CREATE INDEX idx_product_freemius_sale_coupons_freemius_product_id
  ON public.product_freemius_sale_coupons (freemius_product_id);

CREATE OR REPLACE FUNCTION public.handle_product_freemius_sale_coupons_write()
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

DROP TRIGGER IF EXISTS on_product_freemius_sale_coupons_write ON public.product_freemius_sale_coupons;
CREATE TRIGGER on_product_freemius_sale_coupons_write
  BEFORE INSERT OR UPDATE ON public.product_freemius_sale_coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_freemius_sale_coupons_write();

ALTER TABLE public.product_freemius_sale_coupons ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.product_freemius_sale_coupons TO authenticated, service_role;

CREATE POLICY product_freemius_sale_coupons_admin_policy
  ON public.product_freemius_sale_coupons
  FOR ALL
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY product_freemius_sale_coupons_service_role_policy
  ON public.product_freemius_sale_coupons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
