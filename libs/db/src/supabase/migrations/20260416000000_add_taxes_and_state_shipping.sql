-- 20260416000000_add_taxes_and_state_shipping.sql
-- Adds Stripe-oriented tax support and hardens shipping zones for state/province matching.

BEGIN;

-- 1. Shipping zones: keep the existing relational model and normalize it for state/province use.
UPDATE public.shipping_zone_locations
SET
  country_code = upper(btrim(country_code)),
  state_code = CASE
    WHEN state_code IS NULL OR btrim(state_code) = '' THEN NULL
    ELSE upper(btrim(state_code))
  END,
  postal_code = CASE
    WHEN postal_code IS NULL OR btrim(postal_code) = '' THEN NULL
    ELSE upper(btrim(postal_code))
  END;

COMMENT ON COLUMN public.shipping_zone_locations.country_code IS
  'ISO 3166-1 alpha-2 country code.';
COMMENT ON COLUMN public.shipping_zone_locations.state_code IS
  'Optional state/province code within the selected country (for example CA, NY, ON, QC). NULL means the whole country.';
COMMENT ON COLUMN public.shipping_zone_locations.postal_code IS
  'Optional exact postal code or wildcard pattern. NULL means all postal codes in the matched country/state.';

CREATE INDEX IF NOT EXISTS idx_shipping_zone_locations_zone_id
  ON public.shipping_zone_locations (zone_id);

CREATE INDEX IF NOT EXISTS idx_shipping_zone_locations_country_state_postal
  ON public.shipping_zone_locations (country_code, state_code, postal_code);

CREATE OR REPLACE FUNCTION public.handle_shipping_zone_locations_write()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS on_shipping_zone_locations_write ON public.shipping_zone_locations;
CREATE TRIGGER on_shipping_zone_locations_write
  BEFORE INSERT OR UPDATE ON public.shipping_zone_locations
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_shipping_zone_locations_write();

-- 2. Global tax setting: extend the existing ecommerce settings JSON.
INSERT INTO public.site_settings (key, value)
VALUES (
  'ecommerce_inventory_settings',
  '{"track_quantities": true, "enable_taxes": false}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = CASE
  WHEN jsonb_typeof(site_settings.value) = 'object' THEN
    jsonb_set(
      jsonb_set(
        site_settings.value,
        '{track_quantities}',
        COALESCE(
          site_settings.value->'track_quantities',
          site_settings.value->'trackQuantities',
          'true'::jsonb
        ),
        true
      ),
      '{enable_taxes}',
      COALESCE(
        site_settings.value->'enable_taxes',
        site_settings.value->'enableTaxes',
        'false'::jsonb
      ),
      true
    )
  ELSE
    jsonb_build_object(
      'track_quantities',
      CASE
        WHEN lower(trim(BOTH '"' FROM site_settings.value::text)) IN ('false', 'f', '0', 'no', 'off') THEN false
        ELSE true
      END,
      'enable_taxes',
      false
    )
END;

-- 3. Product tax toggle: current repo table is public.products.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'is_taxable'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN is_taxable boolean;
  END IF;
END $$;

UPDATE public.products
SET is_taxable = true
WHERE is_taxable IS NULL;

ALTER TABLE public.products
  ALTER COLUMN is_taxable SET DEFAULT true,
  ALTER COLUMN is_taxable SET NOT NULL;

COMMENT ON COLUMN public.products.is_taxable IS
  'When true, this product participates in Stripe tax calculation.';

-- 4. Manual tax rates table.
-- tax_rate stores a percent value, not a decimal fraction: 5.0000 = 5%.
CREATE TABLE IF NOT EXISTS public.tax_rates (
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

UPDATE public.tax_rates
SET
  country_code = upper(btrim(country_code)),
  state_code = CASE
    WHEN state_code IS NULL OR btrim(state_code) = '' THEN NULL
    ELSE upper(btrim(state_code))
  END,
  tax_name = btrim(tax_name);

CREATE UNIQUE INDEX IF NOT EXISTS tax_rates_country_state_name_key
  ON public.tax_rates (country_code, COALESCE(state_code, ''), lower(tax_name));

CREATE INDEX IF NOT EXISTS idx_tax_rates_country_state
  ON public.tax_rates (country_code, state_code);

CREATE OR REPLACE FUNCTION public.handle_tax_rates_write()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS on_tax_rates_write ON public.tax_rates;
CREATE TRIGGER on_tax_rates_write
  BEFORE INSERT OR UPDATE ON public.tax_rates
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_tax_rates_write();

-- 5. RLS for tax_rates: public read, admin write.
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tax_rates" ON public.tax_rates;
CREATE POLICY "Public read tax_rates"
  ON public.tax_rates
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage tax_rates" ON public.tax_rates;
CREATE POLICY "Admins manage tax_rates"
  ON public.tax_rates
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service Role manages tax_rates" ON public.tax_rates;
CREATE POLICY "Service Role manages tax_rates"
  ON public.tax_rates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Grants for the new table.
GRANT SELECT ON TABLE public.tax_rates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.tax_rates TO authenticated;
GRANT ALL ON TABLE public.tax_rates TO service_role;

COMMIT;
