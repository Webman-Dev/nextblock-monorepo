-- 00000000000009_seed_translations.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000024_seed_core_translations.sql
-- Base profile, account, and storefront translations.

INSERT INTO public.translations (key, translations)
VALUES 
  ('continue_with_github', '{"en": "Continue with GitHub", "es": "Continuar con GitHub", "fr": "Continuer avec GitHub"}'::jsonb),
  ('or_continue_with', '{"en": "Or continue with", "es": "O continuar con", "fr": "Ou continuer avec"}'::jsonb),
  ('customer_profile', '{"en": "Customer Profile", "es": "Perfil de Cliente", "fr": "Profil Client"}'::jsonb),
  ('personal_information', '{"en": "Personal Information", "es": "Información Personal", "fr": "Informations Personnelles"}'::jsonb),
  ('full_name', '{"en": "Full Name", "es": "Nombre Completo", "fr": "Nom Complet"}'::jsonb),
  ('github_username', '{"en": "GitHub Username", "es": "Nombre de usuario de GitHub", "fr": "Nom d''utilisateur GitHub"}'::jsonb),
  ('github_username_help', '{"en": "Required only for purchasing developer licenses.", "es": "Requerido solo para comprar licencias de desarrollador.", "fr": "Requis uniquement pour l''achat de licences développeur."}'::jsonb),
  ('phone_number', '{"en": "Phone Number", "es": "Número de Teléfono", "fr": "Numéro de Téléphone"}'::jsonb),
  ('billing_address', '{"en": "Billing Address", "es": "Dirección de Facturación", "fr": "Adresse de Facturation"}'::jsonb),
  ('address_line_1', '{"en": "Address Line 1", "es": "Dirección Línea 1", "fr": "Adresse Ligne 1"}'::jsonb),
  ('address_line_2', '{"en": "Address Line 2 (Optional)", "es": "Dirección Línea 2 (Opcional)", "fr": "Adresse Ligne 2 (Optionnel)"}'::jsonb),
  ('city', '{"en": "City", "es": "Ciudad", "fr": "Ville"}'::jsonb),
  ('state_province', '{"en": "State / Province", "es": "Estado / Provincia", "fr": "État / Province"}'::jsonb),
  ('postal_zip_code', '{"en": "Postal / Zip Code", "es": "Código Postal", "fr": "Code Postal"}'::jsonb),
  ('country', '{"en": "Country", "es": "País", "fr": "Pays"}'::jsonb),
  ('save_profile', '{"en": "Save Profile", "es": "Guardar Perfil", "fr": "Enregistrer le Profil"}'::jsonb),
  ('saving', '{"en": "Saving...", "es": "Guardando...", "fr": "Enregistrement..."}'::jsonb),
  ('profile_updated_success', '{"en": "Profile updated successfully", "es": "Perfil actualizado con éxito", "fr": "Profil mis à jour avec succès"}'::jsonb),
  ('profile_update_failed', '{"en": "Failed to update profile", "es": "Error al actualizar el perfil", "fr": "Échec de la mise à jour du profil"}'::jsonb),
  ('address_required', '{"en": "Address is required", "es": "La dirección es obligatoria", "fr": "L''adresse est requise"}'::jsonb),
  ('city_required', '{"en": "City is required", "es": "La ciudad es obligatoria", "fr": "La ville est requise"}'::jsonb),
  ('zip_code_required', '{"en": "Zip Code is required", "es": "El código postal es obligatorio", "fr": "Le code postal est requis"}'::jsonb),
  ('country_required', '{"en": "Country is required", "es": "El país es obligatorio", "fr": "Le pays est requis"}'::jsonb),
  ('enter_valid_json', '{"en": "Enter valid JSON for billing address.", "es": "Ingrese JSON válido para la dirección de facturación.", "fr": "Entrez un JSON valide pour l''adresse de facturation."}'::jsonb),
  ('public_profile', '{"en": "Public Profile", "es": "Perfil Público", "fr": "Profil Public"}'::jsonb),
  ('details', '{"en": "Account Details", "es": "Detalles de la Cuenta", "fr": "Détails du Compte"}'::jsonb),
  ('identity', '{"en": "Identity", "es": "Identidad", "fr": "Identité"}'::jsonb),
  ('website', '{"en": "Website", "es": "Sitio Web", "fr": "Site Web"}'::jsonb),
  ('avatar_url', '{"en": "Avatar URL", "es": "URL del Avatar", "fr": "URL de l''Avatar"}'::jsonb),
  ('connect_github', '{"en": "Connect GitHub", "es": "Conectar GitHub", "fr": "Connecter GitHub"}'::jsonb),
  ('github_link_failed', '{"en": "Failed to link GitHub account", "es": "Error al vincular cuenta de GitHub", "fr": "Échec de la liaison du compte GitHub"}'::jsonb),
  ('save_changes', '{"en": "Save Changes", "es": "Guardar Cambios", "fr": "Enregistrer les Modifications"}'::jsonb),
  ('github_connected', '{"en": "GitHub Connected", "es": "GitHub Conectado", "fr": "GitHub Connecté"}'::jsonb),
  ('linked_to', '{"en": "Linked to", "es": "Vinculado a", "fr": "Lié à"}'::jsonb),
  ('optional', '{"en": "Optional", "fr": "Optionnel"}'::jsonb),
  ('shipping_address', '{"en": "Shipping Address", "fr": "Adresse de livraison"}'::jsonb),
  ('profile_settings_title', '{"en": "Profile Settings", "fr": "Paramètres du profil"}'::jsonb),
  ('profile_settings_description', '{"en": "Keep your contact details and default addresses up to date for faster checkout.", "fr": "Gardez vos coordonnées et adresses par défaut à jour pour un paiement plus rapide."}'::jsonb),
  ('profile_not_found', '{"en": "Profile not found.", "fr": "Profil introuvable."}'::jsonb),
  ('profile_basic_info_help', '{"en": "This information appears on your account and helps us prepare your orders.", "fr": "Ces informations apparaissent sur votre compte et nous aident à préparer vos commandes."}'::jsonb),
  ('profile_address_defaults_help', '{"en": "These default addresses are prefilled during checkout and can still be edited for each order.", "fr": "Ces adresses par défaut sont préremplies au paiement et restent modifiables pour chaque commande."}'::jsonb),
  ('use_billing_for_shipping', '{"en": "Use billing address for shipping", "fr": "Utiliser l''adresse de facturation pour la livraison"}'::jsonb),
  ('profile_use_billing_for_shipping_help', '{"en": "Keep one default address unless you regularly ship somewhere else.", "fr": "Gardez une seule adresse par défaut sauf si vous faites souvent livrer ailleurs."}'::jsonb),
  ('checkout_complete_billing_address', '{"en": "Please complete your billing address before continuing.", "fr": "Veuillez compléter votre adresse de facturation avant de continuer."}'::jsonb),
  ('checkout_complete_shipping_address', '{"en": "Please complete your shipping address before continuing.", "fr": "Veuillez compléter votre adresse de livraison avant de continuer."}'::jsonb),
  ('checkout_prefill_notice', '{"en": "Using your saved account details for {email}. You can still adjust them for this order.", "fr": "Nous utilisons les renseignements enregistrés pour {email}. Vous pouvez toujours les ajuster pour cette commande."}'::jsonb),
  ('checkout_billing_address_help', '{"en": "We use this address for payment verification and invoicing.", "fr": "Nous utilisons cette adresse pour la vérification du paiement et la facturation."}'::jsonb),
  ('checkout_use_billing_for_shipping_help', '{"en": "Uncheck this if you want your order delivered to a different address.", "fr": "Décochez ceci si vous souhaitez faire livrer votre commande à une autre adresse."}'::jsonb),
  ('checkout_shipping_address_help', '{"en": "Choose where physical items should be delivered.", "fr": "Choisissez où les articles physiques doivent être livrés."}'::jsonb),
  ('checkout_payment_only_notice', '{"en": "Stripe checkout is kept focused on payment because your address details are already collected here.", "fr": "Le paiement Stripe reste centré sur le paiement puisque vos coordonnées sont déjà recueillies ici."}'::jsonb),
  ('auth.signup_existing_account_hint', '{"en": "That email may already be registered. Try signing in or resetting your password.", "fr": "Cette adresse e-mail est peut-être déjà utilisée. Essayez de vous connecter ou de réinitialiser votre mot de passe."}'::jsonb),
  ('auth.signup_check_email_profile', '{"en": "Check your email to confirm your account. We''ll bring you to your profile next so you can finish setting up your details.", "fr": "Vérifiez votre e-mail pour confirmer votre compte. Nous vous amènerons ensuite à votre profil pour terminer la configuration de vos renseignements."}'::jsonb),
  ('ecommerce.add_to_cart', '{"en": "Add to Cart", "fr": "Ajouter au panier"}'::jsonb),
  ('ecommerce.added_to_cart', '{"en": "Added to cart", "fr": "Ajouté au panier"}'::jsonb),
  ('ecommerce.added_to_cart_success', '{"en": "{item} added to cart", "fr": "{item} ajouté au panier"}'::jsonb),
  ('ecommerce.added_to_cart_error', '{"en": "Failed to add item to cart", "fr": "Échec de l''ajout au panier"}'::jsonb),
  ('ecommerce.no_image', '{"en": "No Image", "fr": "Pas d''image"}'::jsonb),
  ('ecommerce.view_details', '{"en": "View Details", "fr": "Voir les détails"}'::jsonb),
  ('ecommerce.item_added_desc', '{"en": "The item has been added to your cart.", "fr": "L''article a été ajouté à votre panier."}'::jsonb),
  ('ecommerce.checkout', '{"en": "Checkout", "fr": "Paiement"}'::jsonb),
  ('ecommerce.cart', '{"en": "Cart", "fr": "Panier"}'::jsonb),
  ('ecommerce.subtotal', '{"en": "Subtotal", "fr": "Sous-total"}'::jsonb),
  ('ecommerce.shipping', '{"en": "Shipping", "fr": "Livraison"}'::jsonb),
  ('ecommerce.tax', '{"en": "Tax", "fr": "Taxes"}'::jsonb),
  ('ecommerce.total', '{"en": "Total", "fr": "Total"}'::jsonb),
  ('ecommerce.order_summary', '{"en": "Order Summary", "fr": "Résumé de la commande"}'::jsonb),
  ('ecommerce.order_summary_desc', '{"en": "Review your items before proceeding to payment.", "fr": "Vérifiez vos articles avant de procéder au paiement."}'::jsonb),
  ('ecommerce.payment_details', '{"en": "Payment Details", "fr": "Détails du paiement"}'::jsonb),
  ('ecommerce.shipping_info', '{"en": "Shipping Information", "fr": "Informations de livraison"}'::jsonb),
  ('ecommerce.delivery_notice', '{"en": "Digital product - No shipping required", "fr": "Produit numérique - Aucune livraison requise"}'::jsonb),
  ('ecommerce.back_to_shop', '{"en": "Back to Shop", "fr": "Retour à la boutique"}'::jsonb),
  ('ecommerce.empty_cart', '{"en": "Your cart is empty", "fr": "Votre panier est vide"}'::jsonb),
  ('ecommerce.no_products_found', '{"en": "No products found", "fr": "Aucun produit trouvé"}'::jsonb),
  ('ecommerce.featured_products', '{"en": "Featured Products", "fr": "Produits vedettes"}'::jsonb),
  ('ecommerce.latest_products', '{"en": "Latest Products", "fr": "Derniers produits"}'::jsonb),
  ('ecommerce.search_products', '{"en": "Search products...", "fr": "Rechercher des produits..."}'::jsonb),
  ('ecommerce.price_low_to_high', '{"en": "Price: Low to High", "fr": "Prix : Croissant"}'::jsonb),
  ('ecommerce.price_high_to_low', '{"en": "Price: High to Low", "fr": "Prix : Décroissant"}'::jsonb),
  ('ecommerce.newest', '{"en": "Newest", "fr": "Nouveautés"}'::jsonb),
  ('ecommerce.filters', '{"en": "Filters", "fr": "Filtres"}'::jsonb),
  ('ecommerce.apply_filters', '{"en": "Apply Filters", "fr": "Appliquer les filtres"}'::jsonb),
  ('ecommerce.clear_all', '{"en": "Clear All", "fr": "Tout effacer"}'::jsonb),
  ('ecommerce.digital_notice', '{"en": "This is a digital product. You will receive access instructions via email after purchase.", "fr": "Ceci est un produit numérique. Vous recevrez les instructions d''accès par e-mail après l''achat."}'::jsonb),
  ('ecommerce.shopping_cart', '{"en": "Shopping Cart", "fr": "Panier d''achat"}'::jsonb),
  ('ecommerce.cart_empty', '{"en": "Your cart is empty", "fr": "Votre panier est vide"}'::jsonb),
  ('ecommerce.cart_empty_description', '{"en": "Looks like you haven''t added anything to your cart yet.", "fr": "On dirait que vous n''avez encore rien ajouté à votre panier."}'::jsonb),
  ('ecommerce.continue_shopping', '{"en": "Continue Shopping", "fr": "Continuer vos achats"}'::jsonb),
  ('ecommerce.go_to_shop', '{"en": "Go to Shop", "fr": "Aller à la boutique"}'::jsonb),
  ('ecommerce.checkout_successful', '{"en": "Checkout Successful", "fr": "Paiement Réussi"}'::jsonb),
  ('ecommerce.sandbox_notice', '{"en": "This is a Sandbox environment. The Freemius checkout is skipped here for demo purposes.", "fr": "Ceci est un environnement de bac à sable. Le paiement Freemius est sauté ici à des fins de démonstration."}'::jsonb),
  ('ecommerce.license_notice', '{"en": "To purchase a real license for your self-hosted NextBlock™ instance, visit:", "fr": "Pour acheter une vraie licence pour votre instance NextBlock™ auto-hébergée, visitez :"}'::jsonb),
  ('ecommerce.purchase_at', '{"en": "Purchase at nextblock.ca", "fr": "Acheter sur nextblock.ca"}'::jsonb),
  ('ecommerce.qty', '{"en": "Qty", "fr": "Qté"}'::jsonb),
  ('ecommerce.quantity', '{"en": "Quantity", "fr": "Quantité"}'::jsonb),
  ('ecommerce.product', '{"en": "Product", "fr": "Produit"}'::jsonb),
  ('ecommerce.price', '{"en": "Price", "fr": "Prix"}'::jsonb),
  ('ecommerce.secure_payment', '{"en": "Secure payment processing", "fr": "Traitement sécurisé du paiement"}'::jsonb),
  ('ecommerce.shipping_taxes_notice', '{"en": "* Taxes and shipping will be calculated on the next step.", "fr": "* Les taxes et les frais de livraison seront calculés à l''étape suivante."}'::jsonb),
  ('ecommerce.shipping_taxes_calculated', '{"en": "Shipping & taxes calculated at checkout.", "fr": "Livraison et taxes calculées lors du paiement."}'::jsonb),
  ('ecommerce.email_address', '{"en": "Email Address", "fr": "Adresse e-mail"}'::jsonb),
  ('ecommerce.pay_now', '{"en": "Pay Now", "fr": "Payer maintenant"}'::jsonb),
  ('ecommerce.proceed_to_checkout', '{"en": "Proceed to Checkout", "fr": "Passer à la caisse"}'::jsonb),
  ('ecommerce.processing', '{"en": "Processing...", "fr": "Traitement..."}'::jsonb),
  ('ecommerce.invalid_email', '{"en": "Please enter a valid email address.", "fr": "Veuillez entrer une adresse e-mail valide."}'::jsonb),
  ('ecommerce.checkout_failed', '{"en": "Checkout failed: ", "fr": "Le paiement a échoué : "}'::jsonb),
  ('ecommerce.generic_error', '{"en": "An error occurred. Please try again.", "fr": "Une erreur est survenue. Veuillez réessayer."}'::jsonb),
  ('ecommerce.checkout_popup_blocked', '{"en": "Checkout popup blocked or failed to load. Falling back to direct link.", "fr": "Le popup de paiement a été bloqué ou n''a pas pu être chargé. Retour au lien direct."}'::jsonb),
  ('ecommerce.view_full_cart', '{"en": "View Full Cart", "fr": "Voir le panier complet"}'::jsonb),
  ('ecommerce.ready_to_checkout', '{"en": "Ready to Checkout?", "fr": "Prêt à passer au paiement ?"}'::jsonb),
  ('ecommerce.sale_badge', '{"en": "Sale {percent}% Off", "fr": "Solde {percent}% de rabais"}'::jsonb),
  ('ecommerce.low_stock', '{"en": "Only {count} left", "fr": "Plus que {count} en stock"}'::jsonb),
  ('ecommerce.instant_digital_delivery', '{"en": "Instant Digital Delivery", "fr": "Livraison numérique instantanée"}'::jsonb),
  ('ecommerce.free_shipping', '{"en": "Free Shipping", "fr": "Livraison gratuite"}'::jsonb),
  ('ecommerce.secure_checkout', '{"en": "Secure Checkout", "fr": "Paiement sécurisé"}'::jsonb),
  ('ecommerce.no_description', '{"en": "No description available.", "fr": "Aucune description disponible."}'::jsonb),
  ('ecommerce.checkout_overlay_title', '{"en": "Order Checkout", "fr": "Paiement de la commande"}'::jsonb),
  ('ecommerce.email_placeholder', '{"en": "you@example.com", "fr": "vous@exemple.com"}'::jsonb),
  ('ecommerce.contact_information', '{"en": "Contact Information", "fr": "Informations de contact"}'::jsonb),
  ('ecommerce.shipping_address', '{"en": "Shipping Address", "fr": "Adresse de livraison"}'::jsonb),
  ('ecommerce.shipping_method', '{"en": "Shipping Method", "fr": "Mode de livraison"}'::jsonb),
  ('ecommerce.available_rates', '{"en": "Available Rates", "fr": "Tarifs disponibles"}'::jsonb),
  ('ecommerce.calculating', '{"en": "Calculating...", "fr": "Calcul en cours..."}'::jsonb),
  ('ecommerce.select_rate', '{"en": "Select a shipping rate", "fr": "Sélectionnez un tarif de livraison"}'::jsonb),
  ('ecommerce.enter_postal_code', '{"en": "Enter postal code", "fr": "Entrez le code postal"}'::jsonb),
  ('ecommerce.free', '{"en": "Free", "fr": "Gratuit"}'::jsonb),
  ('ecommerce.first_last_name', '{"en": "First & Last Name", "fr": "Nom et prénom"}'::jsonb),
  ('ecommerce.address', '{"en": "Address", "fr": "Adresse"}'::jsonb),
  ('ecommerce.city', '{"en": "City", "fr": "Ville"}'::jsonb),
  ('ecommerce.state_province', '{"en": "State / Province", "fr": "État / Province"}'::jsonb),
  ('ecommerce.zip_postal', '{"en": "ZIP / Postal Code", "fr": "Code postal"}'::jsonb),
  ('ecommerce.postal_code', '{"en": "Postal Code", "fr": "Code postal"}'::jsonb),
  ('ecommerce.zip_postal_code', '{"en": "ZIP / Postal Code", "fr": "Code postal"}'::jsonb),
  ('ecommerce.estimate_shipping', '{"en": "Estimate Shipping", "fr": "Estimer la livraison"}'::jsonb),
  ('ecommerce.calculate', '{"en": "Calculate", "fr": "Calculer"}'::jsonb),
  ('ecommerce.no_rates_found', '{"en": "No shipping rates found for this region.", "fr": "Aucun tarif de livraison trouvé pour cette région."}'::jsonb),
  ('ecommerce.no_rates_for_region', '{"en": "No shipping rates found for this region.", "fr": "Aucun tarif de livraison trouvé pour cette région."}'::jsonb),
  ('ecommerce.enter_address_for_rates', '{"en": "Enter your address to see shipping rates.", "fr": "Entrez votre adresse pour voir les tarifs de livraison."}'::jsonb),
  ('ecommerce.secure_checkout_guarantee', '{"en": "Secure checkout guaranteed", "fr": "Paiement sécurisé garanti"}'::jsonb),
  ('ecommerce.pricing_unavailable', '{"en": "Pricing unavailable", "fr": "Prix non disponible"}'::jsonb),
  ('ecommerce.monthly', '{"en": "Monthly", "fr": "Mensuel"}'::jsonb),
  ('ecommerce.annual', '{"en": "Annual", "fr": "Annuel"}'::jsonb),
  ('ecommerce.lifetime', '{"en": "Lifetime", "fr": "À vie"}'::jsonb),
  ('ecommerce.year', '{"en": "year", "fr": "an"}'::jsonb),
  ('ecommerce.month', '{"en": "month", "fr": "mois"}'::jsonb),
  ('ecommerce.get_license', '{"en": "Get License", "fr": "Obtenir la licence"}'::jsonb),
  ('ecommerce.full_name', '{"en": "Full Name", "fr": "Nom complet"}'::jsonb),
  ('ecommerce.country', '{"en": "Country", "fr": "Pays"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;

-- 00000000000025_seed_freemius_translations.sql
-- Freemius storefront copy introduced with the licensing expansion.

INSERT INTO public.translations (key, translations) VALUES
  ('ecommerce.pricing_unavailable', '{"en": "Pricing Unavailable", "es": "Precios no disponibles"}'),
  ('ecommerce.monthly', '{"en": "Monthly", "es": "Mensual"}'),
  ('ecommerce.annual', '{"en": "Annual", "es": "Anual"}'),
  ('ecommerce.lifetime', '{"en": "Lifetime", "es": "De por vida"}'),
  ('ecommerce.year', '{"en": "year", "es": "año"}'),
  ('ecommerce.month', '{"en": "month", "es": "mes"}'),
  ('ecommerce.get_license', '{"en": "Get License", "es": "Obtener Licencia"}'),
  ('ecommerce.added_to_cart_success', '{"en": "{item} added to your cart.", "es": "{item} añadido al carrito."}'),
  ('ecommerce.added_to_cart_error', '{"en": "Could not add item to cart.", "es": "No se pudo añadir el artículo al carrito."}'),
  ('ecommerce.freemius_trial_preference_title', '{"en": "How would you like to start your trial?", "es": "¿Cómo te gustaría comenzar tu prueba?", "fr": "Comment souhaitez-vous commencer votre essai ?"}'),
  ('ecommerce.freemius_trial_no_card', '{"en": "Start Free Trial (No card required)", "es": "Comenzar prueba gratuita (Sin tarjeta)", "fr": "Commencer l''essai gratuit (Sans carte requise)"}'),
  ('ecommerce.freemius_trial_with_card', '{"en": "Enter Payment Details Now (Still get full trial length free)", "es": "Ingresar detalles de pago ahora (Aún obtienes toda la duración de la prueba gratis)", "fr": "Entrer les détails de paiement maintenant (Vous bénéficiez toujours de toute la durée de l''essai gratuitement)"}'),
  ('ecommerce.freemius_trial_with_card_help', '{"en": "You will not be billed until the trial ends. Cancel anytime.", "es": "No se te cobrará hasta que termine la prueba. Cancela en cualquier momento.", "fr": "Vous ne serez pas facturé avant la fin de l''essai. Annulez à tout moment."}')
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;

-- 00000000000026_seed_product_variation_translation_keys.sql
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

-- 00000000000027_seed_shipping_rate_translations.sql
-- Shipping and tax copy for checkout.

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

-- 00000000000028_seed_invoice_branding_translations.sql
-- Invoice, branding, and receipt translations.

INSERT INTO public.translations (key, translations)
VALUES
  (
    'branding',
    '{"en": "Branding", "fr": "Image de marque"}'::jsonb
  ),
  (
    'company_name',
    '{"en": "Company name", "fr": "Nom de l''entreprise"}'::jsonb
  ),
  (
    'invoice',
    '{"en": "Invoice", "fr": "Facture"}'::jsonb
  ),
  (
    'invoice_number',
    '{"en": "Invoice #", "fr": "Facture no"}'::jsonb
  ),
  (
    'paid_on',
    '{"en": "Paid on", "fr": "Paye le"}'::jsonb
  ),
  (
    'bill_to',
    '{"en": "Bill to", "fr": "Facturer a"}'::jsonb
  ),
  (
    'ship_to',
    '{"en": "Ship to", "fr": "Livrer a"}'::jsonb
  ),
  (
    'print_invoice',
    '{"en": "Print / Save as PDF", "fr": "Imprimer / Enregistrer en PDF"}'::jsonb
  ),
  (
    'tax_registrations',
    '{"en": "Tax registrations", "fr": "Inscriptions fiscales"}'::jsonb
  ),
  (
    'invoice_settings',
    '{"en": "Invoice settings", "fr": "Parametres de facture"}'::jsonb
  ),
  (
    'business_name',
    '{"en": "Business name", "fr": "Nom de l''entreprise"}'::jsonb
  ),
  (
    'order_number',
    '{"en": "Order #", "fr": "Commande no"}'::jsonb
  ),
  (
    'print_invoice_help',
    '{"en": "Use your browser print dialog to save this invoice as a PDF.", "fr": "Utilisez la boite de dialogue d''impression de votre navigateur pour enregistrer cette facture en PDF."}'::jsonb
  ),
  (
    'return_home',
    '{"en": "Return to Home", "fr": "Retour a l''accueil"}'::jsonb
  ),
  (
    'receipt_finalizing',
    '{"en": "Finalizing your invoice and payment details...", "fr": "Finalisation de votre facture et des details du paiement..."}'::jsonb
  ),
  (
    'receipt_not_ready',
    '{"en": "Your invoice will appear here once the payment sync is complete.", "fr": "Votre facture apparaitra ici une fois la synchronisation du paiement terminee."}'::jsonb
  ),
  (
    'tax_breakdown',
    '{"en": "Tax breakdown", "fr": "Detail des taxes"}'::jsonb
  ),
  (
    'amount',
    '{"en": "Amount", "fr": "Montant"}'::jsonb
  ),
  (
    'price',
    '{"en": "Price", "fr": "Prix"}'::jsonb
  ),
  (
    'from',
    '{"en": "From", "fr": "De"}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET
  translations = EXCLUDED.translations,
  updated_at = now();

-- 00000000000029_seed_account_order_translations.sql
-- Adds storefront account navigation, customer order, and password translations.

BEGIN;

INSERT INTO public.translations (key, translations)
VALUES
  (
    'account_navigation',
    '{"en": "Account", "fr": "Compte"}'::jsonb
  ),
  (
    'account_orders',
    '{"en": "Orders", "fr": "Commandes"}'::jsonb
  ),
  (
    'change_my_password',
    '{"en": "Change my password", "fr": "Changer mon mot de passe"}'::jsonb
  ),
  (
    'profile_orders_title',
    '{"en": "My orders", "fr": "Mes commandes"}'::jsonb
  ),
  (
    'profile_orders_description',
    '{"en": "Review your recent purchases and open printable invoices.", "fr": "Consultez vos achats récents et ouvrez vos factures imprimables."}'::jsonb
  ),
  (
    'profile_orders_empty',
    '{"en": "You do not have any orders yet.", "fr": "Vous n''avez pas encore de commandes."}'::jsonb
  ),
  (
    'profile_order_detail_title',
    '{"en": "Order invoice", "fr": "Facture de commande"}'::jsonb
  ),
  (
    'profile_order_detail_description',
    '{"en": "Review and print your finalized invoice.", "fr": "Consultez et imprimez votre facture finalisée."}'::jsonb
  ),
  (
    'profile_order_invoice_pending',
    '{"en": "The printable invoice will appear here once this order has been finalized.", "fr": "La facture imprimable apparaîtra ici une fois que cette commande aura été finalisée."}'::jsonb
  ),
  (
    'profile_password_title',
    '{"en": "Change your password", "fr": "Changer votre mot de passe"}'::jsonb
  ),
  (
    'profile_password_description',
    '{"en": "Update your account password without leaving your profile.", "fr": "Mettez à jour le mot de passe de votre compte sans quitter votre profil."}'::jsonb
  ),
  (
    'new_password',
    '{"en": "New password", "fr": "Nouveau mot de passe"}'::jsonb
  ),
  (
    'confirm_new_password',
    '{"en": "Confirm new password", "fr": "Confirmer le nouveau mot de passe"}'::jsonb
  ),
  (
    'password_updated_success',
    '{"en": "Password updated successfully.", "fr": "Mot de passe mis à jour avec succès."}'::jsonb
  ),
  (
    'password_update_failed',
    '{"en": "Password update failed.", "fr": "La mise à jour du mot de passe a échoué."}'::jsonb
  ),
  (
    'passwords_do_not_match',
    '{"en": "Passwords do not match.", "fr": "Les mots de passe ne correspondent pas."}'::jsonb
  ),
  (
    'order_date',
    '{"en": "Date", "fr": "Date"}'::jsonb
  ),
  (
    'order_status_paid',
    '{"en": "Paid", "fr": "Payée"}'::jsonb
  ),
  (
    'order_status_pending',
    '{"en": "Pending", "fr": "En attente"}'::jsonb
  ),
  (
    'order_status_trial',
    '{"en": "Trial", "fr": "Essai"}'::jsonb
  ),
  (
    'order_status_shipped',
    '{"en": "Shipped", "fr": "Expédiée"}'::jsonb
  ),
  (
    'order_status_cancelled',
    '{"en": "Cancelled", "fr": "Annulée"}'::jsonb
  ),
  (
    'order_status_refunded',
    '{"en": "Refunded", "fr": "Remboursée"}'::jsonb
  ),
  (
    'back_to_orders',
    '{"en": "Back to orders", "fr": "Retour aux commandes"}'::jsonb
  ),
  (
    'ecommerce.checkout_trial_started',
    '{"en": "Trial started", "fr": "Essai demarre"}'::jsonb
  ),
  (
    'ecommerce.checkout_order_pending',
    '{"en": "Order pending", "fr": "Commande en attente"}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;

COMMIT;

-- 00000000000030_seed_checkout_state_translations.sql
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

-- 00000000000031_seed_french_freemius_translation_fixes.sql
-- Restores French translations that were overwritten by the Freemius ecommerce expansion seed.
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

-- 00000000000032_seed_global_search_translations.sql
-- Global storefront search copy.
INSERT INTO public.translations (key, translations)
VALUES
  (
    'edit_product',
    '{"en": "Edit Product", "fr": "Modifier le produit"}'::jsonb
  ),
  (
    'global_search.trigger',
    '{"en": "Search", "fr": "Rechercher"}'::jsonb
  ),
  (
    'global_search.title',
    '{"en": "Search", "fr": "Rechercher"}'::jsonb
  ),
  (
    'global_search.description',
    '{"en": "Search published pages, posts, and products.", "fr": "Rechercher dans les pages, articles et produits publies."}'::jsonb
  ),
  (
    'global_search.placeholder',
    '{"en": "Search...", "fr": "Rechercher..."}'::jsonb
  ),
  (
    'global_search.filter_all',
    '{"en": "All", "fr": "Tout"}'::jsonb
  ),
  (
    'global_search.filter_pages',
    '{"en": "Pages", "fr": "Pages"}'::jsonb
  ),
  (
    'global_search.filter_posts',
    '{"en": "Posts", "fr": "Articles"}'::jsonb
  ),
  (
    'global_search.filter_products',
    '{"en": "Products", "fr": "Produits"}'::jsonb
  ),
  (
    'global_search.result_page',
    '{"en": "Page", "fr": "Page"}'::jsonb
  ),
  (
    'global_search.result_post',
    '{"en": "Post", "fr": "Article"}'::jsonb
  ),
  (
    'global_search.result_product',
    '{"en": "Product", "fr": "Produit"}'::jsonb
  ),
  (
    'global_search.recent',
    '{"en": "Recent", "fr": "Recents"}'::jsonb
  ),
  (
    'global_search.error_title',
    '{"en": "Search is unavailable.", "fr": "La recherche est indisponible."}'::jsonb
  ),
  (
    'global_search.error_description',
    '{"en": "Please try again in a moment.", "fr": "Veuillez reessayer dans un instant."}'::jsonb
  ),
  (
    'global_search.empty_title',
    '{"en": "No results found.", "fr": "Aucun resultat trouve."}'::jsonb
  ),
  (
    'global_search.empty_description',
    '{"en": "Try another search term.", "fr": "Essayez un autre terme de recherche."}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET
  translations = EXCLUDED.translations,
  updated_at = now();
