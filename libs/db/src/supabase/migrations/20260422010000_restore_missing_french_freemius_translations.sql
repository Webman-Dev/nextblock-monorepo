-- Restore French translations that were overwritten by the Freemius ecommerce expansion seed.
INSERT INTO public.translations (key, translations)
VALUES
  (
    'ecommerce.pricing_unavailable',
    jsonb_build_object(
      'en', 'Pricing Unavailable',
      'es', 'Precios no disponibles',
      'fr', 'Tarification indisponible'
    )
  ),
  (
    'ecommerce.monthly',
    jsonb_build_object(
      'en', 'Monthly',
      'es', 'Mensual',
      'fr', 'Mensuel'
    )
  ),
  (
    'ecommerce.annual',
    jsonb_build_object(
      'en', 'Annual',
      'es', 'Anual',
      'fr', 'Annuel'
    )
  ),
  (
    'ecommerce.lifetime',
    jsonb_build_object(
      'en', 'Lifetime',
      'es', 'De por vida',
      'fr', 'À vie'
    )
  ),
  (
    'ecommerce.year',
    jsonb_build_object(
      'en', 'year',
      'es', 'año',
      'fr', 'an'
    )
  ),
  (
    'ecommerce.month',
    jsonb_build_object(
      'en', 'month',
      'es', 'mes',
      'fr', 'mois'
    )
  ),
  (
    'ecommerce.get_license',
    jsonb_build_object(
      'en', 'Get License',
      'es', 'Obtener Licencia',
      'fr', 'Obtenir la licence'
    )
  ),
  (
    'ecommerce.added_to_cart_success',
    jsonb_build_object(
      'en', '{item} added to your cart.',
      'es', '{item} añadido al carrito.',
      'fr', '{item} ajouté à votre panier.'
    )
  ),
  (
    'ecommerce.added_to_cart_error',
    jsonb_build_object(
      'en', 'Could not add item to cart.',
      'es', 'No se pudo añadir el artículo al carrito.',
      'fr', 'Impossible d''ajouter l''article au panier.'
    )
  )
ON CONFLICT (key) DO UPDATE
SET translations =
  COALESCE(public.translations.translations, '{}'::jsonb)
  || jsonb_build_object('fr', EXCLUDED.translations->>'fr');
