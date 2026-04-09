-- 00000000000010_setup_translations.sql
-- Setup translations table

CREATE TABLE IF NOT EXISTS public.translations (
    key text PRIMARY KEY,
    translations jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.translations.key IS 'A unique, slugified identifier (e.g., "sign_in_button_text").';
COMMENT ON COLUMN public.translations.translations IS 'Stores translations as key-value pairs (e.g., {"en": "Sign In", "fr": "s''inscrire"}).';

-- Trigger: set_updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at') THEN
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.translations
        FOR EACH ROW
        EXECUTE FUNCTION public.set_current_timestamp_updated_at();
    END IF;
END $$;

-- 20260116 - Profile Form Translations (Moved from merged profiles migration)
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
  ('ecommerce.license_notice', '{"en": "To purchase a real license for your self-hosted NextBlock instance, visit:", "fr": "Pour acheter une vraie licence pour votre instance NextBlock auto-hébergée, visitez :"}'::jsonb),
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
