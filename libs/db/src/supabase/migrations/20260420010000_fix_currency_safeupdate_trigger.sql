-- 20260420010000_fix_currency_safeupdate_trigger.sql
-- Avoids safe-update errors when a default currency sync touches legacy price columns.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_legacy_price_columns_for_currency(target_currency text)
RETURNS void
LANGUAGE plpgsql
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

COMMIT;
