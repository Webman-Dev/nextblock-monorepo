-- 00000000000004_setup_fulfillment_shipping_taxes_and_currencies.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000012_setup_orders_and_invoiceing.sql
-- Orders, line items, and invoice numbering primitives.

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled', 'refunded')) DEFAULT 'pending',
  total integer NOT NULL,
  stripe_session_id text UNIQUE,
  payment_intent_id text,
  customer_details jsonb,
  provider text CHECK (provider IN ('stripe', 'freemius')) DEFAULT 'stripe',
  currency text NOT NULL DEFAULT 'USD',
  subtotal integer,
  shipping_total integer,
  tax_total integer NOT NULL DEFAULT 0,
  tax_details jsonb,
  exchange_rate_at_purchase numeric(20,10) NOT NULL DEFAULT 1,
  inventory_deducted_at timestamptz,
  invoice_number text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT orders_exchange_rate_at_purchase_positive CHECK (exchange_rate_at_purchase > 0)
);

COMMENT ON COLUMN public.orders.currency IS
  'ISO currency code used for the order totals.';
COMMENT ON COLUMN public.orders.subtotal IS
  'Subtotal before shipping and tax, in the smallest currency unit.';
COMMENT ON COLUMN public.orders.shipping_total IS
  'Shipping amount before tax, in the smallest currency unit.';
COMMENT ON COLUMN public.orders.tax_total IS
  'Total tax amount collected for the order, in the smallest currency unit.';
COMMENT ON COLUMN public.orders.tax_details IS
  'Normalized tax breakdown payload sourced from manual rates or finalized Stripe tax data.';
COMMENT ON COLUMN public.orders.exchange_rate_at_purchase IS
  'Exchange rate locked at purchase time relative to the store default currency.';
COMMENT ON COLUMN public.orders.invoice_number IS
  'Stable printable invoice number assigned once when the order first becomes paid.';
COMMENT ON COLUMN public.orders.paid_at IS
  'Timestamp when the order was first marked as paid.';

CREATE UNIQUE INDEX idx_orders_invoice_number_unique
  ON public.orders (invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price_at_purchase integer NOT NULL
);

CREATE SEQUENCE public.order_invoice_number_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

-- 00000000000013_setup_shipping_and_taxes.sql
-- Shipping zones, shipping methods, and manual tax rates.

CREATE TABLE public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  priority_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.shipping_zone_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  state_code text,
  postal_code text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN public.shipping_zone_locations.country_code IS
  'ISO 3166-1 alpha-2 country code.';
COMMENT ON COLUMN public.shipping_zone_locations.state_code IS
  'Optional state/province code within the selected country (for example CA, NY, ON, QC). NULL means the whole country.';
COMMENT ON COLUMN public.shipping_zone_locations.postal_code IS
  'Optional exact postal code or wildcard pattern. NULL means all postal codes in the matched country/state.';

CREATE TABLE public.shipping_zone_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  method_type text NOT NULL CHECK (method_type IN ('flat_rate', 'free_shipping')),
  cost_amount integer NOT NULL DEFAULT 0,
  cost_currency text NOT NULL DEFAULT 'USD',
  min_order_amount integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  name_translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency_pricing_mode text NOT NULL DEFAULT 'auto',
  cost_amounts jsonb NOT NULL DEFAULT '{}'::jsonb,
  min_order_amounts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT shipping_zone_methods_currency_pricing_mode_valid
    CHECK (currency_pricing_mode IN ('auto', 'manual')),
  CONSTRAINT shipping_zone_methods_cost_currency_format
    CHECK (cost_currency ~ '^[A-Z]{3}$')
);

COMMENT ON COLUMN public.shipping_zone_methods.name_translations IS
  'Localized shipping method labels keyed by language code. Example: {"fr": "Livraison standard"}.';
COMMENT ON COLUMN public.shipping_zone_methods.currency_pricing_mode IS
  'Whether this rate uses auto FX conversion from a single source currency or exact manual amounts per currency.';
COMMENT ON COLUMN public.shipping_zone_methods.cost_amounts IS
  'Shipping costs by ISO 4217 code in the smallest currency unit.';
COMMENT ON COLUMN public.shipping_zone_methods.min_order_amounts IS
  'Minimum order thresholds by ISO 4217 code in the smallest currency unit.';

CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  state_code text,
  tax_name text NOT NULL CHECK (char_length(btrim(tax_name)) > 0),
  tax_rate numeric(7,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tax_rates IS
  'Manual tax rates used for Stripe storefront orders. Multiple rows can exist per jurisdiction to support combined taxes such as GST + PST.';
COMMENT ON COLUMN public.tax_rates.country_code IS
  'ISO 3166-1 alpha-2 country code.';
COMMENT ON COLUMN public.tax_rates.state_code IS
  'Optional state/province code within country_code. NULL represents a country-wide or federal tax.';
COMMENT ON COLUMN public.tax_rates.tax_name IS
  'Display name for the tax component, for example GST, PST, HST, or State Sales Tax.';
COMMENT ON COLUMN public.tax_rates.tax_rate IS
  'Percent value, not decimal fraction. Example: 5.0000 means 5%.';

CREATE UNIQUE INDEX tax_rates_country_state_name_key
  ON public.tax_rates (country_code, COALESCE(state_code, ''), lower(tax_name));

-- 00000000000014_setup_currencies.sql
-- Multi-currency configuration.

CREATE TABLE public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z]{3}$'),
  symbol text NOT NULL,
  exchange_rate numeric(20,10) NOT NULL CHECK (exchange_rate > 0),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  rounding_mode text NOT NULL DEFAULT 'none',
  rounding_increment integer NOT NULL DEFAULT 1,
  rounding_charm_amount integer,
  auto_update_exchange_rate boolean NOT NULL DEFAULT true,
  exchange_rate_updated_at timestamptz,
  exchange_rate_source text,
  auto_sync_product_prices boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT currencies_default_must_be_active CHECK (NOT is_default OR is_active),
  CONSTRAINT currencies_rounding_mode_valid
    CHECK (rounding_mode IN ('none', 'nearest', 'up', 'down', 'charm')),
  CONSTRAINT currencies_rounding_increment_positive
    CHECK (rounding_increment > 0),
  CONSTRAINT currencies_rounding_charm_nonnegative
    CHECK (rounding_charm_amount IS NULL OR rounding_charm_amount >= 0),
  CONSTRAINT currencies_charm_requires_amount
    CHECK (rounding_mode <> 'charm' OR rounding_charm_amount IS NOT NULL),
  CONSTRAINT currencies_default_exchange_rate_is_one
    CHECK (NOT is_default OR exchange_rate = 1),
  CONSTRAINT currencies_default_auto_update_disabled
    CHECK (NOT is_default OR auto_update_exchange_rate = false),
  CONSTRAINT currencies_default_product_price_sync_disabled
    CHECK (NOT is_default OR auto_sync_product_prices = false)
);

COMMENT ON TABLE public.currencies IS
  'Store currencies available for storefront display and conversion.';
COMMENT ON COLUMN public.currencies.exchange_rate IS
  'Relative to the current store default currency. The default currency should have exchange_rate = 1.';
COMMENT ON COLUMN public.currencies.rounding_mode IS
  'Rounding strategy applied when prices are auto-converted into this currency.';
COMMENT ON COLUMN public.currencies.rounding_increment IS
  'Rounding step in the currency smallest unit. Example: 5 means 0.05 for USD/CAD.';
COMMENT ON COLUMN public.currencies.rounding_charm_amount IS
  'Charm ending in the currency smallest unit. Example: 90 means prices like 29.90.';
COMMENT ON COLUMN public.currencies.auto_update_exchange_rate IS
  'Whether scheduled FX sync jobs should refresh this currency.';
COMMENT ON COLUMN public.currencies.exchange_rate_updated_at IS
  'When this currency exchange rate was last refreshed or manually set.';
COMMENT ON COLUMN public.currencies.exchange_rate_source IS
  'Human-readable source for the current exchange rate, such as a provider host or manual override.';
COMMENT ON COLUMN public.currencies.auto_sync_product_prices IS
  'Whether storefront product and variant prices in this currency are derived automatically from the store default currency using FX and rounding rules.';

CREATE UNIQUE INDEX idx_currencies_single_default
  ON public.currencies (is_default)
  WHERE is_default = true;

-- 00000000000017_setup_currency_shipping_and_tax_functions.sql
-- Currency, shipping, and tax helper functions plus dependent constraints.

CREATE OR REPLACE FUNCTION public.handle_shipping_zone_locations_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.country_code = upper(btrim(NEW.country_code));
  NEW.state_code = CASE
    WHEN NEW.state_code IS NULL OR btrim(NEW.state_code) = '' THEN NULL
    ELSE upper(btrim(NEW.state_code))
  END;
  NEW.postal_code = CASE
    WHEN NEW.postal_code IS NULL OR btrim(NEW.postal_code) = '' THEN NULL
    ELSE upper(btrim(NEW.postal_code))
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_tax_rates_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.country_code = upper(btrim(NEW.country_code));
  NEW.state_code = CASE
    WHEN NEW.state_code IS NULL OR btrim(NEW.state_code) = '' THEN NULL
    ELSE upper(btrim(NEW.state_code))
  END;
  NEW.tax_name = btrim(NEW.tax_name);
  NEW.updated_at = now();

  IF NEW.created_at IS NULL THEN
    NEW.created_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_default_currency_code()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
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
SET search_path = ''
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
SET search_path = ''
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
SET search_path = ''
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
SET search_path = ''
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
      NEW.prices := NEW.prices || jsonb_build_object(
        v_default_currency,
        GREATEST(COALESCE(NEW.price, 0), 0)
      );
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

  NEW.prices := NEW.prices || jsonb_build_object(
    v_default_currency,
    GREATEST(COALESCE(NEW.price, 0), 0)
  );

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
SET search_path = ''
AS $$
DECLARE
  v_target_currency text := upper(trim(target_currency));
BEGIN
  UPDATE public.products
  SET
    prices = CASE
      WHEN COALESCE(prices, '{}'::jsonb) ? v_target_currency THEN prices
      ELSE COALESCE(prices, '{}'::jsonb) || jsonb_build_object(v_target_currency, price)
    END,
    sale_prices = CASE
      WHEN sale_price IS NULL THEN sale_prices
      WHEN sale_prices IS NOT NULL AND sale_prices ? v_target_currency THEN sale_prices
      ELSE COALESCE(sale_prices, '{}'::jsonb) || jsonb_build_object(v_target_currency, sale_price)
    END,
    price = CASE
      WHEN COALESCE(prices, '{}'::jsonb) ? v_target_currency THEN
        (COALESCE(prices, '{}'::jsonb) ->> v_target_currency)::integer
      ELSE
        price
    END,
    sale_price = CASE
      WHEN sale_prices IS NOT NULL AND sale_prices ? v_target_currency THEN
        (sale_prices ->> v_target_currency)::integer
      ELSE
        sale_price
    END,
    updated_at = now()
  WHERE
    NOT (COALESCE(prices, '{}'::jsonb) ? v_target_currency)
    OR (
      sale_price IS NOT NULL
      AND (sale_prices IS NULL OR NOT (sale_prices ? v_target_currency))
    )
    OR (
      COALESCE(prices, '{}'::jsonb) ? v_target_currency
      AND price IS DISTINCT FROM (COALESCE(prices, '{}'::jsonb) ->> v_target_currency)::integer
    )
    OR (
      sale_prices IS NOT NULL
      AND sale_prices ? v_target_currency
      AND sale_price IS DISTINCT FROM (sale_prices ->> v_target_currency)::integer
    );

  UPDATE public.product_variants
  SET
    prices = CASE
      WHEN COALESCE(prices, '{}'::jsonb) ? v_target_currency THEN prices
      ELSE COALESCE(prices, '{}'::jsonb) || jsonb_build_object(v_target_currency, price)
    END,
    sale_prices = CASE
      WHEN sale_price IS NULL THEN sale_prices
      WHEN sale_prices IS NOT NULL AND sale_prices ? v_target_currency THEN sale_prices
      ELSE COALESCE(sale_prices, '{}'::jsonb) || jsonb_build_object(v_target_currency, sale_price)
    END,
    price = CASE
      WHEN COALESCE(prices, '{}'::jsonb) ? v_target_currency THEN
        (COALESCE(prices, '{}'::jsonb) ->> v_target_currency)::integer
      ELSE
        price
    END,
    sale_price = CASE
      WHEN sale_prices IS NOT NULL AND sale_prices ? v_target_currency THEN
        (sale_prices ->> v_target_currency)::integer
      ELSE
        sale_price
    END,
    updated_at = now()
  WHERE
    NOT (COALESCE(prices, '{}'::jsonb) ? v_target_currency)
    OR (
      sale_price IS NOT NULL
      AND (sale_prices IS NULL OR NOT (sale_prices ? v_target_currency))
    )
    OR (
      COALESCE(prices, '{}'::jsonb) ? v_target_currency
      AND price IS DISTINCT FROM (COALESCE(prices, '{}'::jsonb) ->> v_target_currency)::integer
    )
    OR (
      sale_prices IS NOT NULL
      AND sale_prices ? v_target_currency
      AND sale_price IS DISTINCT FROM (sale_prices ->> v_target_currency)::integer
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_currency_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  NEW.updated_at := now();

  IF NEW.is_default THEN
    NEW.is_active := true;
    NEW.exchange_rate := 1;
    NEW.auto_update_exchange_rate := false;
    NEW.auto_sync_product_prices := false;
    NEW.exchange_rate_source := COALESCE(NULLIF(NEW.exchange_rate_source, ''), 'store-default');
    NEW.exchange_rate_updated_at := COALESCE(NEW.exchange_rate_updated_at, now());

    UPDATE public.currencies
    SET is_default = false,
        updated_at = now()
    WHERE id IS DISTINCT FROM NEW.id
      AND is_default = true;
  ELSIF NULLIF(NEW.exchange_rate_source, '') IS NULL THEN
    NEW.exchange_rate_source := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_default_currency_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.clear_currency_price_overrides(target_currency text)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_target_currency text := upper(trim(target_currency));
BEGIN
  IF v_target_currency = '' THEN
    RETURN;
  END IF;

  UPDATE public.products
  SET
    prices = COALESCE(prices, '{}'::jsonb) - v_target_currency,
    sale_prices = CASE
      WHEN sale_prices IS NULL THEN NULL
      WHEN sale_prices - v_target_currency = '{}'::jsonb THEN NULL
      ELSE sale_prices - v_target_currency
    END,
    updated_at = now()
  WHERE COALESCE(prices, '{}'::jsonb) ? v_target_currency
     OR COALESCE(sale_prices, '{}'::jsonb) ? v_target_currency;

  UPDATE public.product_variants
  SET
    prices = COALESCE(prices, '{}'::jsonb) - v_target_currency,
    sale_prices = CASE
      WHEN sale_prices IS NULL THEN NULL
      WHEN sale_prices - v_target_currency = '{}'::jsonb THEN NULL
      ELSE sale_prices - v_target_currency
    END,
    updated_at = now()
  WHERE COALESCE(prices, '{}'::jsonb) ? v_target_currency
     OR COALESCE(sale_prices, '{}'::jsonb) ? v_target_currency;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_shipping_method_currency_maps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_source_currency text;
BEGIN
  v_source_currency := upper(trim(COALESCE(NULLIF(NEW.cost_currency, ''), public.get_default_currency_code())));

  NEW.cost_currency := v_source_currency;
  NEW.currency_pricing_mode := COALESCE(NULLIF(lower(trim(NEW.currency_pricing_mode)), ''), 'auto');
  NEW.cost_amounts := public.normalize_currency_amount_map(COALESCE(NEW.cost_amounts, '{}'::jsonb));
  NEW.min_order_amounts := public.normalize_currency_amount_map(COALESCE(NEW.min_order_amounts, '{}'::jsonb));

  IF NEW.currency_pricing_mode NOT IN ('auto', 'manual') THEN
    RAISE EXCEPTION 'Unsupported shipping currency pricing mode: %', NEW.currency_pricing_mode;
  END IF;

  IF NEW.cost_amounts = '{}'::jsonb THEN
    NEW.cost_amounts := jsonb_build_object(v_source_currency, GREATEST(COALESCE(NEW.cost_amount, 0), 0));
  ELSIF NOT (NEW.cost_amounts ? v_source_currency) THEN
    NEW.cost_amounts := NEW.cost_amounts || jsonb_build_object(
      v_source_currency,
      GREATEST(COALESCE(NEW.cost_amount, 0), 0)
    );
  END IF;

  IF NEW.min_order_amounts = '{}'::jsonb THEN
    NEW.min_order_amounts := jsonb_build_object(
      v_source_currency,
      GREATEST(COALESCE(NEW.min_order_amount, 0), 0)
    );
  ELSIF NOT (NEW.min_order_amounts ? v_source_currency) THEN
    NEW.min_order_amounts := NEW.min_order_amounts || jsonb_build_object(
      v_source_currency,
      GREATEST(COALESCE(NEW.min_order_amount, 0), 0)
    );
  END IF;

  IF NEW.currency_pricing_mode = 'auto' THEN
    NEW.cost_amounts := jsonb_build_object(
      v_source_currency,
      GREATEST((NEW.cost_amounts ->> v_source_currency)::integer, 0)
    );
    NEW.min_order_amounts := jsonb_build_object(
      v_source_currency,
      GREATEST((NEW.min_order_amounts ->> v_source_currency)::integer, 0)
    );
  END IF;

  NEW.cost_amount := GREATEST((NEW.cost_amounts ->> v_source_currency)::integer, 0);
  NEW.min_order_amount := GREATEST((NEW.min_order_amounts ->> v_source_currency)::integer, 0);
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

ALTER TABLE public.products
  ADD CONSTRAINT products_prices_is_valid
    CHECK (public.is_valid_currency_amount_map(prices)),
  ADD CONSTRAINT products_sale_prices_are_valid
    CHECK (public.is_valid_sale_price_map(prices, sale_prices));

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_prices_is_valid
    CHECK (public.is_valid_currency_amount_map(prices)),
  ADD CONSTRAINT product_variants_sale_prices_are_valid
    CHECK (public.is_valid_sale_price_map(prices, sale_prices));

ALTER TABLE public.shipping_zone_methods
  ADD CONSTRAINT shipping_zone_methods_cost_amounts_valid
    CHECK (public.is_valid_currency_amount_map(cost_amounts)),
  ADD CONSTRAINT shipping_zone_methods_min_order_amounts_valid
    CHECK (public.is_valid_currency_amount_map(min_order_amounts)),
  ADD CONSTRAINT shipping_zone_methods_cost_amounts_include_source
    CHECK (cost_amounts ? upper(cost_currency)),
  ADD CONSTRAINT shipping_zone_methods_min_order_amounts_include_source
    CHECK (min_order_amounts ? upper(cost_currency));

DROP TRIGGER IF EXISTS on_shipping_zone_locations_write ON public.shipping_zone_locations;
CREATE TRIGGER on_shipping_zone_locations_write
  BEFORE INSERT OR UPDATE ON public.shipping_zone_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_shipping_zone_locations_write();

DROP TRIGGER IF EXISTS on_tax_rates_write ON public.tax_rates;
CREATE TRIGGER on_tax_rates_write
  BEFORE INSERT OR UPDATE ON public.tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tax_rates_write();

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

DROP TRIGGER IF EXISTS trg_set_currency_defaults ON public.currencies;
CREATE TRIGGER trg_set_currency_defaults
  BEFORE INSERT OR UPDATE ON public.currencies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_currency_defaults();

DROP TRIGGER IF EXISTS trg_handle_default_currency_change ON public.currencies;
CREATE TRIGGER trg_handle_default_currency_change
  AFTER INSERT OR UPDATE ON public.currencies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_default_currency_change();

DROP TRIGGER IF EXISTS trg_sync_shipping_method_currency_maps ON public.shipping_zone_methods;
CREATE TRIGGER trg_sync_shipping_method_currency_maps
  BEFORE INSERT OR UPDATE OF cost_amount, cost_currency, min_order_amount, currency_pricing_mode, cost_amounts, min_order_amounts
  ON public.shipping_zone_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_shipping_method_currency_maps();

GRANT EXECUTE ON FUNCTION public.clear_currency_price_overrides(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_currency_price_overrides(text) TO service_role;

-- 00000000000032_seed_shipping_defaults.sql
-- Default North America shipping zone and methods.

DO $$
DECLARE
  v_zone_id uuid;
BEGIN
  INSERT INTO public.shipping_zones (name, priority_order)
  VALUES ('North America', 10)
  RETURNING id INTO v_zone_id;

  INSERT INTO public.shipping_zone_locations (zone_id, country_code)
  VALUES
    (v_zone_id, 'US'),
    (v_zone_id, 'CA'),
    (v_zone_id, 'MX');

  INSERT INTO public.shipping_zone_methods (
    zone_id,
    method_type,
    cost_amount,
    name,
    min_order_amount,
    name_translations
  )
  VALUES
    (
      v_zone_id,
      'flat_rate',
      1500,
      'Standard Shipping',
      0,
      '{"fr": "Livraison standard"}'::jsonb
    ),
    (
      v_zone_id,
      'free_shipping',
      0,
      'Free Shipping (Orders over $100)',
      10000,
      '{"fr": "Livraison gratuite (commandes de plus de 100 $)"}'::jsonb
    );
END
$$;
