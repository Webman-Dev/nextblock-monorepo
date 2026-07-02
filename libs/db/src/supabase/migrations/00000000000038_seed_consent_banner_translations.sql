-- 00000000000038_seed_consent_banner_translations.sql
-- Consent banner UI copy (EN + FR). Forward-only and idempotent.

INSERT INTO public.translations (key, translations)
VALUES
  (
    'privacy.consent.aria_label',
    jsonb_build_object(
      'en', 'Privacy consent',
      'fr', 'Consentement à la confidentialité'
    )
  ),
  (
    'privacy.consent.title',
    jsonb_build_object(
      'en', 'We value your privacy',
      'fr', 'Nous respectons votre vie privée'
    )
  ),
  (
    'privacy.consent.description_before_policy_link',
    jsonb_build_object(
      'en', 'We use only essential cookies by default. With your consent we also use analytics to improve the site. See our',
      'fr', 'Nous utilisons seulement les témoins essentiels par défaut. Avec votre consentement, nous utilisons aussi l''analytique pour améliorer le site. Consultez notre'
    )
  ),
  (
    'privacy.consent.privacy_policy_link',
    jsonb_build_object(
      'en', 'Privacy Policy',
      'fr', 'politique de confidentialité'
    )
  ),
  (
    'privacy.consent.description_after_policy_link',
    jsonb_build_object(
      'en', '.',
      'fr', '.'
    )
  ),
  (
    'privacy.consent.privacy_policy_href',
    jsonb_build_object(
      'en', '/privacy-policy',
      'fr', '/politique-de-confidentialite'
    )
  ),
  (
    'privacy.consent.necessary_label',
    jsonb_build_object(
      'en', 'Necessary',
      'fr', 'Nécessaires'
    )
  ),
  (
    'privacy.consent.necessary_help',
    jsonb_build_object(
      'en', 'Always on',
      'fr', 'Toujours actifs'
    )
  ),
  (
    'privacy.consent.analytics_label',
    jsonb_build_object(
      'en', 'Analytics',
      'fr', 'Analytique'
    )
  ),
  (
    'privacy.consent.analytics_help',
    jsonb_build_object(
      'en', 'Usage insights',
      'fr', 'Statistiques d''utilisation'
    )
  ),
  (
    'privacy.consent.marketing_label',
    jsonb_build_object(
      'en', 'Marketing',
      'fr', 'Marketing'
    )
  ),
  (
    'privacy.consent.marketing_help',
    jsonb_build_object(
      'en', 'Personalized content',
      'fr', 'Contenu personnalisé'
    )
  ),
  (
    'privacy.consent.save_choices',
    jsonb_build_object(
      'en', 'Save choices',
      'fr', 'Enregistrer mes choix'
    )
  ),
  (
    'privacy.consent.accept_all',
    jsonb_build_object(
      'en', 'Accept all',
      'fr', 'Tout accepter'
    )
  ),
  (
    'privacy.consent.reject_all',
    jsonb_build_object(
      'en', 'Reject all',
      'fr', 'Tout refuser'
    )
  ),
  (
    'privacy.consent.hide_options',
    jsonb_build_object(
      'en', 'Hide options',
      'fr', 'Masquer les options'
    )
  ),
  (
    'privacy.consent.manage_options',
    jsonb_build_object(
      'en', 'Manage options',
      'fr', 'Gérer les options'
    )
  )
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;
