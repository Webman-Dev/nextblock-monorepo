-- 00000000000010_setup_translations.sql
-- Setup translations table

CREATE TABLE public.translations (
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

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

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
  ('linked_to', '{"en": "Linked to", "es": "Vinculado a", "fr": "Lié à"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

