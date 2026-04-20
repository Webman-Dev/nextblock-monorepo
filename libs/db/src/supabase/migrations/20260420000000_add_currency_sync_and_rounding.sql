-- 20260420000000_add_currency_sync_and_rounding.sql
-- Adds automated FX sync metadata and merchant-friendly rounding rules.

BEGIN;

ALTER TABLE public.currencies
  ADD COLUMN IF NOT EXISTS rounding_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS rounding_increment integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rounding_charm_amount integer,
  ADD COLUMN IF NOT EXISTS auto_update_exchange_rate boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exchange_rate_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS exchange_rate_source text;

UPDATE public.currencies
SET
  rounding_mode = COALESCE(rounding_mode, 'none'),
  rounding_increment = COALESCE(rounding_increment, 1),
  auto_update_exchange_rate = CASE
    WHEN is_default THEN false
    ELSE COALESCE(auto_update_exchange_rate, true)
  END,
  exchange_rate = CASE
    WHEN is_default THEN 1
    ELSE exchange_rate
  END,
  exchange_rate_source = CASE
    WHEN is_default THEN COALESCE(NULLIF(exchange_rate_source, ''), 'store-default')
    WHEN NULLIF(exchange_rate_source, '') IS NULL THEN 'manual'
    ELSE exchange_rate_source
  END,
  exchange_rate_updated_at = CASE
    WHEN is_default THEN COALESCE(exchange_rate_updated_at, now())
    ELSE COALESCE(exchange_rate_updated_at, now())
  END,
  updated_at = now();

ALTER TABLE public.currencies
  DROP CONSTRAINT IF EXISTS currencies_rounding_mode_valid,
  ADD CONSTRAINT currencies_rounding_mode_valid
    CHECK (rounding_mode IN ('none', 'nearest', 'up', 'down', 'charm'));

ALTER TABLE public.currencies
  DROP CONSTRAINT IF EXISTS currencies_rounding_increment_positive,
  ADD CONSTRAINT currencies_rounding_increment_positive
    CHECK (rounding_increment > 0);

ALTER TABLE public.currencies
  DROP CONSTRAINT IF EXISTS currencies_rounding_charm_nonnegative,
  ADD CONSTRAINT currencies_rounding_charm_nonnegative
    CHECK (rounding_charm_amount IS NULL OR rounding_charm_amount >= 0);

ALTER TABLE public.currencies
  DROP CONSTRAINT IF EXISTS currencies_charm_requires_amount,
  ADD CONSTRAINT currencies_charm_requires_amount
    CHECK (rounding_mode <> 'charm' OR rounding_charm_amount IS NOT NULL);

ALTER TABLE public.currencies
  DROP CONSTRAINT IF EXISTS currencies_default_exchange_rate_is_one,
  ADD CONSTRAINT currencies_default_exchange_rate_is_one
    CHECK (NOT is_default OR exchange_rate = 1);

ALTER TABLE public.currencies
  DROP CONSTRAINT IF EXISTS currencies_default_auto_update_disabled,
  ADD CONSTRAINT currencies_default_auto_update_disabled
    CHECK (NOT is_default OR auto_update_exchange_rate = false);

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

COMMIT;
