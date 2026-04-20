-- 20260420030000_add_multi_currency_shipping_rates.sql
-- Adds manual-vs-auto multi-currency support for shipping rates.

BEGIN;

ALTER TABLE public.shipping_zone_methods
  ADD COLUMN IF NOT EXISTS currency_pricing_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS cost_amounts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS min_order_amounts jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.shipping_zone_methods
SET
  cost_currency = upper(trim(COALESCE(NULLIF(cost_currency, ''), public.get_default_currency_code()))),
  currency_pricing_mode = COALESCE(NULLIF(lower(trim(currency_pricing_mode)), ''), 'auto'),
  cost_amounts = CASE
    WHEN cost_amounts IS NULL OR cost_amounts = '{}'::jsonb THEN
      jsonb_build_object(
        upper(trim(COALESCE(NULLIF(cost_currency, ''), public.get_default_currency_code()))),
        GREATEST(cost_amount, 0)
      )
    ELSE
      public.normalize_currency_amount_map(cost_amounts)
  END,
  min_order_amounts = CASE
    WHEN min_order_amounts IS NULL OR min_order_amounts = '{}'::jsonb THEN
      jsonb_build_object(
        upper(trim(COALESCE(NULLIF(cost_currency, ''), public.get_default_currency_code()))),
        GREATEST(min_order_amount, 0)
      )
    ELSE
      public.normalize_currency_amount_map(min_order_amounts)
  END,
  updated_at = now();

ALTER TABLE public.shipping_zone_methods
  DROP CONSTRAINT IF EXISTS shipping_zone_methods_currency_pricing_mode_valid,
  ADD CONSTRAINT shipping_zone_methods_currency_pricing_mode_valid
    CHECK (currency_pricing_mode IN ('auto', 'manual'));

ALTER TABLE public.shipping_zone_methods
  DROP CONSTRAINT IF EXISTS shipping_zone_methods_cost_currency_format,
  ADD CONSTRAINT shipping_zone_methods_cost_currency_format
    CHECK (cost_currency ~ '^[A-Z]{3}$');

ALTER TABLE public.shipping_zone_methods
  DROP CONSTRAINT IF EXISTS shipping_zone_methods_cost_amounts_valid,
  ADD CONSTRAINT shipping_zone_methods_cost_amounts_valid
    CHECK (public.is_valid_currency_amount_map(cost_amounts));

ALTER TABLE public.shipping_zone_methods
  DROP CONSTRAINT IF EXISTS shipping_zone_methods_min_order_amounts_valid,
  ADD CONSTRAINT shipping_zone_methods_min_order_amounts_valid
    CHECK (public.is_valid_currency_amount_map(min_order_amounts));

ALTER TABLE public.shipping_zone_methods
  DROP CONSTRAINT IF EXISTS shipping_zone_methods_cost_amounts_include_source,
  ADD CONSTRAINT shipping_zone_methods_cost_amounts_include_source
    CHECK (cost_amounts ? upper(cost_currency));

ALTER TABLE public.shipping_zone_methods
  DROP CONSTRAINT IF EXISTS shipping_zone_methods_min_order_amounts_include_source,
  ADD CONSTRAINT shipping_zone_methods_min_order_amounts_include_source
    CHECK (min_order_amounts ? upper(cost_currency));

COMMENT ON COLUMN public.shipping_zone_methods.currency_pricing_mode IS
  'Whether this rate uses auto FX conversion from a single source currency or exact manual amounts per currency.';
COMMENT ON COLUMN public.shipping_zone_methods.cost_amounts IS
  'Shipping costs by ISO 4217 code in the smallest currency unit.';
COMMENT ON COLUMN public.shipping_zone_methods.min_order_amounts IS
  'Minimum order thresholds by ISO 4217 code in the smallest currency unit.';

CREATE OR REPLACE FUNCTION public.sync_shipping_method_currency_maps()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_sync_shipping_method_currency_maps ON public.shipping_zone_methods;
CREATE TRIGGER trg_sync_shipping_method_currency_maps
BEFORE INSERT OR UPDATE OF cost_amount, cost_currency, min_order_amount, currency_pricing_mode, cost_amounts, min_order_amounts
ON public.shipping_zone_methods
FOR EACH ROW
EXECUTE FUNCTION public.sync_shipping_method_currency_maps();

COMMIT;
