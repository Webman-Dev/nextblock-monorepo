-- 00000000000008_seed_platform_defaults.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000023_seed_platform_defaults.sql
-- Default settings, base languages, and the store currency seed.

INSERT INTO public.site_settings (key, value)
VALUES ('footer_copyright', '{"en": "© {year} Nextblock CMS. All rights reserved.", "fr": "© {year} Nextblock CMS. Tous droits réservés."}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('is_admin_created', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES (
  'enabled_payment_providers',
  '{"stripe": false, "freemius": false}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('site_title', '"NextBlock™ CMS"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('site_description', '"NextBlock™ is an open-source CMS on Next.js + Supabase — a visual block editor, blazing-fast multilingual pages, and built-in e-commerce."'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('site_keywords', '"NextBlock, CMS, Next.js, Supabase, headless CMS, block editor, visual page builder, multilingual, e-commerce, open source"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES (
  'ecommerce_inventory_settings',
  '{"track_quantities": true, "enable_taxes": false}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = CASE
  WHEN jsonb_typeof(site_settings.value) = 'object' THEN
    jsonb_set(
      jsonb_set(
        site_settings.value,
        '{track_quantities}',
        COALESCE(
          site_settings.value->'track_quantities',
          site_settings.value->'trackQuantities',
          'true'::jsonb
        ),
        true
      ),
      '{enable_taxes}',
      COALESCE(
        site_settings.value->'enable_taxes',
        site_settings.value->'enableTaxes',
        'false'::jsonb
      ),
      true
    )
  ELSE
    jsonb_build_object(
      'track_quantities',
      CASE
        WHEN lower(trim(BOTH '"' FROM site_settings.value::text)) IN ('false', 'f', '0', 'no', 'off') THEN false
        ELSE true
      END,
      'enable_taxes',
      false
    )
END;

INSERT INTO public.site_settings (key, value)
VALUES (
  'invoice_settings',
  '{
    "business_name": "",
    "email": "",
    "phone": "",
    "address": {
      "line1": "",
      "line2": "",
      "city": "",
      "state": "",
      "postal_code": "",
      "country_code": "CA"
    },
    "tax_registrations": []
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = CASE
  WHEN jsonb_typeof(site_settings.value) = 'object' THEN
    jsonb_build_object(
      'business_name', COALESCE(site_settings.value->>'business_name', ''),
      'email', COALESCE(site_settings.value->>'email', ''),
      'phone', COALESCE(site_settings.value->>'phone', ''),
      'address', CASE
        WHEN jsonb_typeof(site_settings.value->'address') = 'object' THEN
          jsonb_build_object(
            'line1', COALESCE(site_settings.value->'address'->>'line1', ''),
            'line2', COALESCE(site_settings.value->'address'->>'line2', ''),
            'city', COALESCE(site_settings.value->'address'->>'city', ''),
            'state', COALESCE(site_settings.value->'address'->>'state', ''),
            'postal_code', COALESCE(site_settings.value->'address'->>'postal_code', ''),
            'country_code', COALESCE(NULLIF(site_settings.value->'address'->>'country_code', ''), 'CA')
          )
        ELSE
          jsonb_build_object(
            'line1', '',
            'line2', '',
            'city', '',
            'state', '',
            'postal_code', '',
            'country_code', 'CA'
          )
      END,
      'tax_registrations', CASE
        WHEN jsonb_typeof(site_settings.value->'tax_registrations') = 'array' THEN
          site_settings.value->'tax_registrations'
        ELSE
          '[]'::jsonb
      END
    )
  ELSE
    '{
      "business_name": "",
      "email": "",
      "phone": "",
      "address": {
        "line1": "",
        "line2": "",
        "city": "",
        "state": "",
        "postal_code": "",
        "country_code": "CA"
      },
      "tax_registrations": []
    }'::jsonb
END;

INSERT INTO public.languages (code, name, is_default, is_active)
VALUES
  ('en', 'English', true, true),
  ('fr', 'Français', false, true);

INSERT INTO public.currencies (code, symbol, exchange_rate, is_default, is_active)
VALUES ('USD', '$', 1, true, true)
ON CONFLICT (code) DO UPDATE
SET
  symbol = EXCLUDED.symbol,
  exchange_rate = EXCLUDED.exchange_rate,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  updated_at = now();
