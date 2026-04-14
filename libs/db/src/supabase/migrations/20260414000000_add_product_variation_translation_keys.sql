-- Adds missing storefront translation keys for variable-product UX copy.

INSERT INTO public.translations (key, translations)
VALUES
  (
    'ecommerce.choose_your_options',
    '{"en": "Choose Your Options", "fr": "Choisissez vos options"}'::jsonb
  ),
  (
    'ecommerce.variant_availability_help',
    '{"en": "Select a combination to resolve the exact variant price and availability.", "fr": "Selectionnez une combinaison pour afficher le prix exact et la disponibilite de la variante."}'::jsonb
  ),
  (
    'ecommerce.in_stock',
    '{"en": "{count} in stock", "fr": "{count} en stock"}'::jsonb
  ),
  (
    'ecommerce.out_of_stock',
    '{"en": "Out of stock", "fr": "Rupture de stock"}'::jsonb
  ),
  (
    'ecommerce.select_options',
    '{"en": "Select Options", "fr": "Choisir des options"}'::jsonb
  ),
  (
    'ecommerce.variant_selection_required',
    '{"en": "Select one term from every dropdown to resolve a variation.", "fr": "Selectionnez une valeur dans chaque liste pour afficher la variante correspondante."}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET
  translations = EXCLUDED.translations,
  updated_at = now();
