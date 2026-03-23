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
  ('ecommerce.add_to_cart', '{"en": "Add to Cart", "fr": "Ajouter au panier"}'::jsonb),
  ('ecommerce.no_image', '{"en": "No Image", "fr": "Pas d''image"}'::jsonb),
  ('ecommerce.view_details', '{"en": "View Details", "fr": "Voir les détails"}'::jsonb),
  ('ecommerce.added_to_cart', '{"en": "Added to cart", "fr": "Ajouté au panier"}'::jsonb),
  ('ecommerce.item_added_desc', '{"en": "The item has been added to your cart.", "fr": "L''article a été ajouté à votre panier."}'::jsonb),
  ('ecommerce.checkout', '{"en": "Checkout", "fr": "Paiement"}'::jsonb),
  ('ecommerce.cart', '{"en": "Cart", "fr": "Panier"}'::jsonb),
  ('ecommerce.subtotal', '{"en": "Subtotal", "fr": "Sous-total"}'::jsonb),
  ('ecommerce.shipping', '{"en": "Shipping", "fr": "Livraison"}'::jsonb),
  ('ecommerce.tax', '{"en": "Tax", "fr": "Taxes"}'::jsonb),
  ('ecommerce.total', '{"en": "Total", "fr": "Total"}'::jsonb),
  ('ecommerce.order_summary', '{"en": "Order Summary", "fr": "Résumé de la commande"}'::jsonb),
  ('ecommerce.payment_details', '{"en": "Payment Details", "fr": "Détails du paiement"}'::jsonb),
  ('ecommerce.shipping_info', '{"en": "Shipping Information", "fr": "Informations de livraison"}'::jsonb),
  ('ecommerce.delivery_notice', '{"en": "Digital product - No shipping required", "fr": "Produit numérique - Aucune livraison requise"}'::jsonb),
  ('ecommerce.back_to_shop', '{"en": "Back to Shop", "fr": "Retour à la boutique"}'::jsonb),
   ('ecommerce.continue_shopping', '{"en": "Continue Shopping", "fr": "Continuer vos achats"}'::jsonb),
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
  ('ecommerce.order_summary', '{"en": "Order Summary", "fr": "Résumé de la commande"}'::jsonb),
  ('ecommerce.order_summary_desc', '{"en": "Review your items before proceeding to payment.", "fr": "Vérifiez vos articles avant de procéder au paiement."}'::jsonb),
  ('ecommerce.qty', '{"en": "Qty", "fr": "Qté"}'::jsonb),
  ('ecommerce.quantity', '{"en": "Quantity", "fr": "Quantité"}'::jsonb),
  ('ecommerce.product', '{"en": "Product", "fr": "Produit"}'::jsonb),
  ('ecommerce.price', '{"en": "Price", "fr": "Prix"}'::jsonb),
  ('ecommerce.total', '{"en": "Total", "fr": "Total"}'::jsonb),
  ('ecommerce.subtotal', '{"en": "Subtotal", "fr": "Sous-total"}'::jsonb),
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
  ('ecommerce.no_image', '{"en": "No Image", "fr": "Pas d''image"}'::jsonb),
  ('ecommerce.checkout_overlay_title', '{"en": "Order Checkout", "fr": "Paiement de la commande"}'::jsonb),
  ('ecommerce.email_placeholder', '{"en": "you@example.com", "fr": "vous@exemple.com"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;
