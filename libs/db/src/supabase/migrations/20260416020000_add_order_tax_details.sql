-- 20260416020000_add_order_tax_details.sql
-- Stores normalized tax totals and finalized Stripe/manual tax breakdowns on orders.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN currency text NOT NULL DEFAULT 'usd';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN subtotal integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'shipping_total'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN shipping_total integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'tax_total'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN tax_total integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'tax_details'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN tax_details jsonb;
  END IF;
END $$;

UPDATE public.orders
SET
  currency = COALESCE(NULLIF(lower(currency), ''), 'usd'),
  tax_total = COALESCE(tax_total, 0);

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

COMMIT;
