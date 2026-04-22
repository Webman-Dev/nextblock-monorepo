-- Adds checkout state and CTA translations for shipping-gated checkout UX.

BEGIN;

INSERT INTO public.translations (key, translations)
VALUES
  (
    'select_an_option',
    '{"en": "Select an option", "es": "Selecciona una opcion", "fr": "Selectionnez une option"}'::jsonb
  ),
  (
    'ecommerce.shipping_method_required',
    '{"en": "Please select a shipping method before continuing.", "es": "Selecciona un metodo de envio antes de continuar.", "fr": "Veuillez selectionner un mode de livraison avant de continuer."}'::jsonb
  ),
  (
    'ecommerce.waiting_on_address_info',
    '{"en": "Complete your shipping address to view available shipping options.", "es": "Completa tu direccion de envio para ver las opciones de envio disponibles.", "fr": "Completez votre adresse de livraison pour voir les options de livraison disponibles."}'::jsonb
  ),
  (
    'ecommerce.calculating_shipping',
    '{"en": "Calculating shipping...", "es": "Calculando el envio...", "fr": "Calcul de la livraison..."}'::jsonb
  ),
  (
    'ecommerce.sandbox_checkout_stripe_description',
    '{"en": "This simulated step represents the Stripe checkout for physical products.", "es": "Este paso simulado representa el pago de Stripe para productos fisicos.", "fr": "Cette etape simulee represente le paiement Stripe pour les produits physiques."}'::jsonb
  ),
  (
    'ecommerce.sandbox_checkout_freemius_description',
    '{"en": "This simulated step represents the Freemius checkout for digital products.", "es": "Este paso simulado representa el pago de Freemius para productos digitales.", "fr": "Cette etape simulee represente le paiement Freemius pour les produits numeriques."}'::jsonb
  ),
  (
    'ecommerce.digital_label',
    '{"en": "Digital", "es": "Digital", "fr": "Numerique"}'::jsonb
  ),
  (
    'ecommerce.physical_label',
    '{"en": "Physical", "es": "Fisico", "fr": "Physique"}'::jsonb
  ),
  (
    'ecommerce.physical_products',
    '{"en": "Physical products", "es": "Productos fisicos", "fr": "Produits physiques"}'::jsonb
  ),
  (
    'ecommerce.digital_products',
    '{"en": "Digital products", "es": "Productos digitales", "fr": "Produits numeriques"}'::jsonb
  ),
  (
    'ecommerce.estimated_total',
    '{"en": "Estimated total", "es": "Total estimado", "fr": "Total estime"}'::jsonb
  ),
  (
    'ecommerce.stripe_checkout_title',
    '{"en": "Stripe Checkout", "es": "Pago con Stripe", "fr": "Paiement Stripe"}'::jsonb
  ),
  (
    'ecommerce.stripe_checkout_description',
    '{"en": "Pay for physical products in one Stripe checkout session.", "es": "Paga los productos fisicos en una sola sesion de Stripe.", "fr": "Payez les produits physiques dans une seule session Stripe."}'::jsonb
  ),
  (
    'ecommerce.item_count_one',
    '{"en": "{count} item", "es": "{count} articulo", "fr": "{count} article"}'::jsonb
  ),
  (
    'ecommerce.item_count_other',
    '{"en": "{count} items", "es": "{count} articulos", "fr": "{count} articles"}'::jsonb
  ),
  (
    'ecommerce.physical_subtotal',
    '{"en": "Physical subtotal", "es": "Subtotal fisico", "fr": "Sous-total physique"}'::jsonb
  ),
  (
    'ecommerce.total_on_stripe',
    '{"en": "Total on Stripe", "es": "Total en Stripe", "fr": "Total sur Stripe"}'::jsonb
  ),
  (
    'ecommerce.checkout_physical_products',
    '{"en": "Checkout Physical Products", "es": "Pagar productos fisicos", "fr": "Payer les produits physiques"}'::jsonb
  ),
  (
    'ecommerce.shipping_taxes_collected_on_stripe',
    '{"en": "Shipping and taxes are only collected during the Stripe step for physical products.", "es": "El envio y los impuestos solo se cobran durante el paso de Stripe para productos fisicos.", "fr": "La livraison et les taxes sont percues uniquement a l''etape Stripe pour les produits physiques."}'::jsonb
  ),
  (
    'ecommerce.freemius_checkout_title',
    '{"en": "Freemius Checkout", "es": "Pago con Freemius", "fr": "Paiement Freemius"}'::jsonb
  ),
  (
    'ecommerce.freemius_checkout_description',
    '{"en": "Digital products use the Freemius checkout flow.", "es": "Los productos digitales usan el flujo de pago de Freemius.", "fr": "Les produits numeriques utilisent le flux de paiement Freemius."}'::jsonb
  ),
  (
    'ecommerce.license_count_one',
    '{"en": "{count} license", "es": "{count} licencia", "fr": "{count} licence"}'::jsonb
  ),
  (
    'ecommerce.license_count_other',
    '{"en": "{count} licenses", "es": "{count} licencias", "fr": "{count} licences"}'::jsonb
  ),
  (
    'ecommerce.checkout_billing_cycle_monthly',
    '{"en": "Monthly subscription", "es": "Suscripcion mensual", "fr": "Abonnement mensuel"}'::jsonb
  ),
  (
    'ecommerce.checkout_billing_cycle_annual',
    '{"en": "Annual subscription", "es": "Suscripcion anual", "fr": "Abonnement annuel"}'::jsonb
  ),
  (
    'ecommerce.checkout_billing_cycle_lifetime',
    '{"en": "Lifetime subscription", "es": "Suscripcion de por vida", "fr": "Abonnement a vie"}'::jsonb
  ),
  (
    'ecommerce.checkout_product',
    '{"en": "Checkout {title}", "es": "Pagar {title}", "fr": "Paiement de {title}"}'::jsonb
  ),
  (
    'ecommerce.checkout_digital_product',
    '{"en": "Checkout Digital Product", "es": "Pagar producto digital", "fr": "Payer le produit numerique"}'::jsonb
  ),
  (
    'ecommerce.digital_subtotal',
    '{"en": "Digital subtotal", "es": "Subtotal digital", "fr": "Sous-total numerique"}'::jsonb
  ),
  (
    'ecommerce.freemius_multi_checkout_notice',
    '{"en": "Freemius licenses are completed one at a time, so each digital product gets its own checkout action.", "es": "Las licencias de Freemius se completan una por una, por lo que cada producto digital tiene su propia accion de pago.", "fr": "Les licences Freemius se finalisent une a la fois, donc chaque produit numerique a sa propre action de paiement."}'::jsonb
  ),
  (
    'ecommerce.freemius_tax_notice',
    '{"en": "Taxes and compliance for digital products are handled inside the Freemius checkout.", "es": "Los impuestos y la conformidad para los productos digitales se gestionan dentro del pago de Freemius.", "fr": "Les taxes et la conformite pour les produits numeriques sont gerees dans le paiement Freemius."}'::jsonb
  ),
  (
    'continue_checkout',
    '{"en": "Continue Checkout", "fr": "Continuer le paiement"}'::jsonb
  ),
  (
    'checkout_success_sync_failed',
    '{"en": "We could not finalize your invoice yet. Please refresh shortly.", "fr": "Nous n''avons pas encore pu finaliser votre facture. Veuillez rafraichir la page sous peu."}'::jsonb
  ),
  (
    'ecommerce.shipping_country_required',
    '{"en": "Country is required to calculate shipping.", "fr": "Le pays est requis pour calculer la livraison."}'::jsonb
  ),
  (
    'ecommerce.shipping_calculation_failed',
    '{"en": "We couldn''t calculate shipping right now. Please try again.", "fr": "Nous n''avons pas pu calculer la livraison pour le moment. Veuillez reessayer."}'::jsonb
  ),
  (
    'ecommerce.checkout_license_inactive',
    '{"en": "The ecommerce module license is inactive.", "fr": "La licence du module ecommerce est inactive."}'::jsonb
  ),
  (
    'ecommerce.checkout_invalid_items',
    '{"en": "Your checkout items could not be processed.", "fr": "Les articles de votre commande n''ont pas pu etre traites."}'::jsonb
  ),
  (
    'ecommerce.checkout_provider_items_required',
    '{"en": "Each checkout step must include items assigned to a payment provider.", "fr": "Chaque etape de paiement doit inclure des articles associes a un fournisseur de paiement."}'::jsonb
  ),
  (
    'ecommerce.checkout_mixed_provider_steps',
    '{"en": "Products with different payment providers must be purchased in separate checkout steps.", "fr": "Les produits utilisant differents fournisseurs de paiement doivent etre achetes en etapes separees."}'::jsonb
  ),
  (
    'ecommerce.checkout_freemius_single_item',
    '{"en": "Freemius products must be purchased one at a time.", "fr": "Les produits Freemius doivent etre achetes un a la fois."}'::jsonb
  ),
  (
    'ecommerce.checkout_billing_address_required',
    '{"en": "A billing address is required to continue checkout.", "fr": "Une adresse de facturation est requise pour continuer le paiement."}'::jsonb
  ),
  (
    'ecommerce.checkout_internal_server_error',
    '{"en": "Something went wrong while preparing your checkout. Please try again.", "fr": "Une erreur s''est produite lors de la preparation de votre paiement. Veuillez reessayer."}'::jsonb
  ),
  (
    'ecommerce.checkout_missing_session_id',
    '{"en": "We couldn''t find a checkout session to finalize.", "fr": "Nous n''avons pas trouve de session de paiement a finaliser."}'::jsonb
  ),
  (
    'ecommerce.checkout_payment_pending',
    '{"en": "Your payment is still pending.", "fr": "Votre paiement est toujours en attente."}'::jsonb
  ),
  (
    'ecommerce.checkout_success_order_not_found',
    '{"en": "We couldn''t find the order linked to this checkout.", "fr": "Nous n''avons pas trouve la commande liee a ce paiement."}'::jsonb
  ),
  (
    'ecommerce.checkout_success_invalid_reference',
    '{"en": "This checkout reference can''t be finalized from this page.", "fr": "Cette reference de paiement ne peut pas etre finalisee depuis cette page."}'::jsonb
  ),
  (
    'ecommerce.checkout_success_inventory_update_failed',
    '{"en": "We couldn''t update inventory for this order.", "fr": "Nous n''avons pas pu mettre a jour l''inventaire pour cette commande."}'::jsonb
  ),
  (
    'ecommerce.checkout_success_status_update_failed',
    '{"en": "We couldn''t update the order status.", "fr": "Nous n''avons pas pu mettre a jour le statut de la commande."}'::jsonb
  ),
  (
    'ecommerce.unknown_error',
    '{"en": "Unknown error", "es": "Error desconocido", "fr": "Erreur inconnue"}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET
  translations = EXCLUDED.translations,
  updated_at = now();

COMMIT;
