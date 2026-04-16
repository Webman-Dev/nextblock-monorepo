-- 20260416010000_add_shipping_rate_translations.sql
-- Adds translation support for shipping rate labels and localized Stripe tax copy.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shipping_zone_methods'
      AND column_name = 'name_translations'
  ) THEN
    ALTER TABLE public.shipping_zone_methods
      ADD COLUMN name_translations jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

UPDATE public.shipping_zone_methods
SET name_translations = '{}'::jsonb
WHERE name_translations IS NULL;

UPDATE public.shipping_zone_methods
SET name_translations = jsonb_set(
  COALESCE(name_translations, '{}'::jsonb),
  '{fr}',
  to_jsonb(
    CASE
      WHEN name = 'Standard Shipping' THEN 'Livraison standard'
      WHEN name = 'Free Shipping (Orders over $100)' THEN
        'Livraison gratuite (commandes de plus de 100 $)'
      ELSE name
    END
  ),
  true
)
WHERE name IN ('Standard Shipping', 'Free Shipping (Orders over $100)')
  AND COALESCE(name_translations->>'fr', '') = '';

COMMENT ON COLUMN public.shipping_zone_methods.name_translations IS
  'Localized shipping method labels keyed by language code. Example: {"fr": "Livraison standard"}.';

CREATE INDEX IF NOT EXISTS idx_shipping_zone_methods_name_translations
  ON public.shipping_zone_methods
  USING gin (name_translations);

INSERT INTO public.translations (key, translations)
VALUES
  (
    'ecommerce.tax_calculated_on_stripe',
    '{"en": "Calculated on Stripe", "es": "Calculado en Stripe", "fr": "Calculé sur Stripe"}'::jsonb
  ),
  (
    'checkout_stripe_tax_finalized_notice',
    '{"en": "Tax will be finalized by Stripe Tax on the payment step.", "es": "El impuesto se finalizará con Stripe Tax en el paso de pago.", "fr": "La taxe sera finalisée par Stripe Tax à l''étape du paiement."}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;

COMMIT;
