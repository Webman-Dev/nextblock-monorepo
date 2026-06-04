-- 00000000000026_seed_on_sale_translation.sql
-- Storefront "On Sale" badge label (shown on product cards when a scheduled
-- sale is currently active). Seeded across the supported storefront languages.

INSERT INTO public.translations (key, translations)
VALUES
  ('ecommerce.on_sale', '{"en": "On Sale", "fr": "En solde", "es": "En oferta"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;
