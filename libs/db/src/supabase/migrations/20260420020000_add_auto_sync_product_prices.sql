-- 20260420020000_add_auto_sync_product_prices.sql
-- Lets currencies opt into store-managed product and variant pricing.

BEGIN;

ALTER TABLE public.currencies
  ADD COLUMN IF NOT EXISTS auto_sync_product_prices boolean NOT NULL DEFAULT false;

UPDATE public.currencies
SET
  auto_sync_product_prices = CASE
    WHEN is_default THEN false
    ELSE COALESCE(auto_sync_product_prices, false)
  END,
  updated_at = now();

ALTER TABLE public.currencies
  DROP CONSTRAINT IF EXISTS currencies_default_product_price_sync_disabled,
  ADD CONSTRAINT currencies_default_product_price_sync_disabled
    CHECK (NOT is_default OR auto_sync_product_prices = false);

COMMENT ON COLUMN public.currencies.auto_sync_product_prices IS
  'Whether storefront product and variant prices in this currency are derived automatically from the store default currency using FX and rounding rules.';

CREATE OR REPLACE FUNCTION public.set_currency_defaults()
RETURNS trigger
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.clear_currency_price_overrides(target_currency text)
RETURNS void
LANGUAGE plpgsql
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

GRANT EXECUTE ON FUNCTION public.clear_currency_price_overrides(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_currency_price_overrides(text) TO service_role;

COMMIT;
