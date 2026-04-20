-- 20260417000000_setup_currencies.sql
-- Adds multi-currency foundations with compatibility sync for legacy price columns.

BEGIN;

CREATE TABLE IF NOT EXISTS public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z]{3}$'),
  symbol text NOT NULL,
  exchange_rate numeric(20,10) NOT NULL CHECK (exchange_rate > 0),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT currencies_default_must_be_active CHECK (NOT is_default OR is_active)
);

COMMENT ON TABLE public.currencies IS
  'Store currencies available for storefront display and conversion.';
COMMENT ON COLUMN public.currencies.exchange_rate IS
  'Relative to the current store default currency. The default currency should have exchange_rate = 1.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_currencies_single_default
  ON public.currencies (is_default)
  WHERE is_default = true;

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active currencies" ON public.currencies;
CREATE POLICY "Public read active currencies"
  ON public.currencies
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage currencies" ON public.currencies;
CREATE POLICY "Admins manage currencies"
  ON public.currencies
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role manages currencies" ON public.currencies;
CREATE POLICY "Service role manages currencies"
  ON public.currencies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON TABLE public.currencies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.currencies TO authenticated;
GRANT ALL ON TABLE public.currencies TO service_role;

CREATE OR REPLACE FUNCTION public.get_default_currency_code()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT upper(code)
      FROM public.currencies
      WHERE is_default = true
      ORDER BY updated_at DESC, created_at DESC, code ASC
      LIMIT 1
    ),
    'USD'
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_currency_amount_map(amounts jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN amounts IS NULL THEN '{}'::jsonb
    WHEN jsonb_typeof(amounts) <> 'object' THEN amounts
    ELSE COALESCE(
      (
        SELECT jsonb_object_agg(
          upper(trim(entry.key)),
          CASE
            WHEN jsonb_typeof(entry.value) = 'number'
                 AND entry.value::text ~ '^[0-9]+$' THEN
              to_jsonb((entry.value::text)::bigint)
            ELSE
              entry.value
          END
        )
        FROM jsonb_each(amounts) AS entry
      ),
      '{}'::jsonb
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_currency_amount_map(amounts jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN amounts IS NULL THEN false
    WHEN jsonb_typeof(amounts) <> 'object' THEN false
    WHEN amounts = '{}'::jsonb THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM jsonb_each(amounts) AS entry
      WHERE entry.key !~ '^[A-Z]{3}$'
        OR jsonb_typeof(entry.value) <> 'number'
        OR entry.value::text !~ '^[0-9]+$'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_sale_price_map(prices jsonb, sale_prices jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN sale_prices IS NULL THEN true
    WHEN jsonb_typeof(sale_prices) <> 'object' THEN false
    WHEN sale_prices = '{}'::jsonb THEN true
    WHEN prices IS NULL OR jsonb_typeof(prices) <> 'object' THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM jsonb_each(sale_prices) AS entry
      WHERE entry.key !~ '^[A-Z]{3}$'
        OR NOT (prices ? entry.key)
        OR jsonb_typeof(entry.value) <> 'number'
        OR entry.value::text !~ '^[0-9]+$'
        OR entry.value::text::numeric > (prices ->> entry.key)::numeric
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_currency_price_maps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_default_currency text := public.get_default_currency_code();
  v_price_map_changed boolean := false;
  v_legacy_changed boolean := false;
BEGIN
  NEW.prices := public.normalize_currency_amount_map(COALESCE(NEW.prices, '{}'::jsonb));
  NEW.sale_prices := public.normalize_currency_amount_map(COALESCE(NEW.sale_prices, '{}'::jsonb));

  IF NEW.sale_prices = '{}'::jsonb THEN
    NEW.sale_prices := NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_price_map_changed :=
      NEW.prices IS DISTINCT FROM OLD.prices
      OR NEW.sale_prices IS DISTINCT FROM OLD.sale_prices;
    v_legacy_changed :=
      NEW.price IS DISTINCT FROM OLD.price
      OR NEW.sale_price IS DISTINCT FROM OLD.sale_price;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.prices ? v_default_currency THEN
      NEW.price := (NEW.prices ->> v_default_currency)::integer;
    ELSE
      NEW.prices := NEW.prices || jsonb_build_object(v_default_currency, GREATEST(COALESCE(NEW.price, 0), 0));
    END IF;

    IF NEW.sale_prices IS NOT NULL AND NEW.sale_prices ? v_default_currency THEN
      NEW.sale_price := (NEW.sale_prices ->> v_default_currency)::integer;
    ELSIF NEW.sale_price IS NOT NULL THEN
      NEW.sale_prices := COALESCE(NEW.sale_prices, '{}'::jsonb)
        || jsonb_build_object(v_default_currency, GREATEST(NEW.sale_price, 0));
    END IF;

    RETURN NEW;
  END IF;

  IF v_price_map_changed AND NOT v_legacy_changed THEN
    IF NOT (NEW.prices ? v_default_currency) THEN
      NEW.prices := NEW.prices || jsonb_build_object(
        v_default_currency,
        GREATEST(COALESCE(OLD.price, NEW.price, 0), 0)
      );
    END IF;

    NEW.price := (NEW.prices ->> v_default_currency)::integer;
    NEW.sale_price := CASE
      WHEN NEW.sale_prices IS NOT NULL AND NEW.sale_prices ? v_default_currency THEN
        (NEW.sale_prices ->> v_default_currency)::integer
      ELSE
        NULL
    END;

    RETURN NEW;
  END IF;

  NEW.prices := NEW.prices || jsonb_build_object(v_default_currency, GREATEST(COALESCE(NEW.price, 0), 0));

  IF NEW.sale_price IS NULL THEN
    IF NEW.sale_prices IS NOT NULL THEN
      NEW.sale_prices := NEW.sale_prices - v_default_currency;
      IF NEW.sale_prices = '{}'::jsonb THEN
        NEW.sale_prices := NULL;
      END IF;
    END IF;
  ELSE
    NEW.sale_prices := COALESCE(NEW.sale_prices, '{}'::jsonb)
      || jsonb_build_object(v_default_currency, GREATEST(NEW.sale_price, 0));
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_legacy_price_columns_for_currency(target_currency text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products
  SET
    prices = CASE
      WHEN prices ? upper(target_currency) THEN prices
      ELSE prices || jsonb_build_object(upper(target_currency), price)
    END,
    sale_prices = CASE
      WHEN sale_price IS NULL THEN sale_prices
      WHEN sale_prices IS NOT NULL AND sale_prices ? upper(target_currency) THEN sale_prices
      ELSE COALESCE(sale_prices, '{}'::jsonb) || jsonb_build_object(upper(target_currency), sale_price)
    END,
    price = CASE
      WHEN prices ? upper(target_currency) THEN (prices ->> upper(target_currency))::integer
      ELSE price
    END,
    sale_price = CASE
      WHEN sale_prices IS NOT NULL AND sale_prices ? upper(target_currency) THEN
        (sale_prices ->> upper(target_currency))::integer
      ELSE
        sale_price
    END,
    updated_at = now();

  UPDATE public.product_variants
  SET
    prices = CASE
      WHEN prices ? upper(target_currency) THEN prices
      ELSE prices || jsonb_build_object(upper(target_currency), price)
    END,
    sale_prices = CASE
      WHEN sale_price IS NULL THEN sale_prices
      WHEN sale_prices IS NOT NULL AND sale_prices ? upper(target_currency) THEN sale_prices
      ELSE COALESCE(sale_prices, '{}'::jsonb) || jsonb_build_object(upper(target_currency), sale_price)
    END,
    price = CASE
      WHEN prices ? upper(target_currency) THEN (prices ->> upper(target_currency))::integer
      ELSE price
    END,
    sale_price = CASE
      WHEN sale_prices IS NOT NULL AND sale_prices ? upper(target_currency) THEN
        (sale_prices ->> upper(target_currency))::integer
      ELSE
        sale_price
    END,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_currency_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  NEW.updated_at := now();

  IF NEW.is_default THEN
    UPDATE public.currencies
    SET is_default = false,
        updated_at = now()
    WHERE id IS DISTINCT FROM NEW.id
      AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_default_currency_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_default THEN
      PERFORM public.sync_legacy_price_columns_for_currency(NEW.code);
    END IF;
  ELSIF NEW.is_default
        AND (
          OLD.is_default IS DISTINCT FROM NEW.is_default
          OR OLD.code IS DISTINCT FROM NEW.code
        ) THEN
    PERFORM public.sync_legacy_price_columns_for_currency(NEW.code);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_currency_defaults ON public.currencies;
CREATE TRIGGER trg_set_currency_defaults
BEFORE INSERT OR UPDATE ON public.currencies
FOR EACH ROW
EXECUTE FUNCTION public.set_currency_defaults();

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sale_prices jsonb;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sale_prices jsonb;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_prices_is_valid,
  ADD CONSTRAINT products_prices_is_valid
    CHECK (public.is_valid_currency_amount_map(prices));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sale_prices_are_valid,
  ADD CONSTRAINT products_sale_prices_are_valid
    CHECK (public.is_valid_sale_price_map(prices, sale_prices));

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_prices_is_valid,
  ADD CONSTRAINT product_variants_prices_is_valid
    CHECK (public.is_valid_currency_amount_map(prices));

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_sale_prices_are_valid,
  ADD CONSTRAINT product_variants_sale_prices_are_valid
    CHECK (public.is_valid_sale_price_map(prices, sale_prices));

COMMENT ON COLUMN public.products.prices IS
  'Regular prices by ISO 4217 code in the smallest currency unit.';
COMMENT ON COLUMN public.products.sale_prices IS
  'Sale prices by ISO 4217 code in the smallest currency unit.';
COMMENT ON COLUMN public.product_variants.prices IS
  'Variant regular prices by ISO 4217 code in the smallest currency unit.';
COMMENT ON COLUMN public.product_variants.sale_prices IS
  'Variant sale prices by ISO 4217 code in the smallest currency unit.';

CREATE INDEX IF NOT EXISTS idx_products_prices_gin
  ON public.products
  USING gin (prices jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_product_variants_prices_gin
  ON public.product_variants
  USING gin (prices jsonb_path_ops);

INSERT INTO public.currencies (code, symbol, exchange_rate, is_default, is_active)
VALUES ('USD', '$', 1, true, true)
ON CONFLICT (code) DO UPDATE
SET symbol = EXCLUDED.symbol,
    exchange_rate = EXCLUDED.exchange_rate,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = now();

UPDATE public.products
SET
  prices = jsonb_build_object('USD', GREATEST(price, 0)),
  sale_prices = CASE
    WHEN sale_price IS NOT NULL THEN
      jsonb_build_object('USD', GREATEST(sale_price, 0))
    ELSE
      NULL
  END
WHERE prices = '{}'::jsonb OR prices IS NULL;

UPDATE public.product_variants
SET
  prices = jsonb_build_object('USD', GREATEST(price, 0)),
  sale_prices = CASE
    WHEN sale_price IS NOT NULL THEN
      jsonb_build_object('USD', GREATEST(sale_price, 0))
    ELSE
      NULL
  END
WHERE prices = '{}'::jsonb OR prices IS NULL;

DROP TRIGGER IF EXISTS trg_sync_products_currency_prices ON public.products;
CREATE TRIGGER trg_sync_products_currency_prices
BEFORE INSERT OR UPDATE OF price, sale_price, prices, sale_prices
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_currency_price_maps();

DROP TRIGGER IF EXISTS trg_sync_product_variants_currency_prices ON public.product_variants;
CREATE TRIGGER trg_sync_product_variants_currency_prices
BEFORE INSERT OR UPDATE OF price, sale_price, prices, sale_prices
ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.sync_currency_price_maps();

DROP TRIGGER IF EXISTS trg_handle_default_currency_change ON public.currencies;
CREATE TRIGGER trg_handle_default_currency_change
AFTER INSERT OR UPDATE ON public.currencies
FOR EACH ROW
EXECUTE FUNCTION public.handle_default_currency_change();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'exchange_rate_at_purchase'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN exchange_rate_at_purchase numeric(20,10) NOT NULL DEFAULT 1;
  END IF;
END $$;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_exchange_rate_at_purchase_positive,
  ADD CONSTRAINT orders_exchange_rate_at_purchase_positive
    CHECK (exchange_rate_at_purchase > 0);

ALTER TABLE public.orders
  ALTER COLUMN currency SET DEFAULT 'USD';

UPDATE public.orders
SET
  currency = upper(COALESCE(NULLIF(currency, ''), 'USD')),
  exchange_rate_at_purchase = COALESCE(exchange_rate_at_purchase, 1);

COMMENT ON COLUMN public.orders.currency IS
  'ISO currency code used for the order totals.';
COMMENT ON COLUMN public.orders.exchange_rate_at_purchase IS
  'Exchange rate locked at purchase time relative to the store default currency.';

COMMIT;
