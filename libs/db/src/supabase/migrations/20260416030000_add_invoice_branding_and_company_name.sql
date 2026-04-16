-- 20260416030000_add_invoice_branding_and_company_name.sql
-- Adds invoice numbering, branding settings, and optional company names on addresses.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_addresses'
      AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.user_addresses
      ADD COLUMN company_name text;
  END IF;
END $$;

COMMENT ON COLUMN public.user_addresses.company_name IS
  'Optional company or organization name for the address.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN invoice_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

COMMENT ON COLUMN public.orders.invoice_number IS
  'Stable printable invoice number assigned once when the order first becomes paid.';
COMMENT ON COLUMN public.orders.paid_at IS
  'Timestamp when the order was first marked as paid.';

CREATE SEQUENCE IF NOT EXISTS public.order_invoice_number_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.format_order_invoice_number(p_value bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'INV-' || lpad(p_value::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.generate_order_invoice_number()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT public.format_order_invoice_number(nextval('public.order_invoice_number_seq'));
$$;

CREATE OR REPLACE FUNCTION public.assign_order_invoice_metadata(
  p_order_id uuid,
  p_paid_at timestamptz DEFAULT now()
)
RETURNS TABLE(invoice_number text, paid_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_effective_paid_at timestamptz;
BEGIN
  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  v_effective_paid_at := COALESCE(v_order.paid_at, p_paid_at, now(), v_order.created_at);

  UPDATE public.orders
  SET
    invoice_number = COALESCE(v_order.invoice_number, public.generate_order_invoice_number()),
    paid_at = v_effective_paid_at
  WHERE id = p_order_id
  RETURNING orders.invoice_number, orders.paid_at
  INTO invoice_number, paid_at;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_order_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_invoice_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_order_invoice_metadata(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_invoice_metadata(uuid, timestamptz) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice_number_unique
  ON public.orders (invoice_number)
  WHERE invoice_number IS NOT NULL;

DO $$
DECLARE
  v_existing_max bigint;
  v_order record;
BEGIN
  SELECT MAX(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '')::bigint)
    INTO v_existing_max
  FROM public.orders
  WHERE invoice_number IS NOT NULL;

  IF v_existing_max IS NOT NULL THEN
    PERFORM setval('public.order_invoice_number_seq', GREATEST(v_existing_max, 1), true);
  END IF;

  FOR v_order IN
    SELECT
      id,
      COALESCE(paid_at, created_at, now()) AS effective_paid_at
    FROM public.orders
    WHERE status = 'paid'
      AND invoice_number IS NULL
    ORDER BY COALESCE(paid_at, created_at, now()), created_at, id
  LOOP
    UPDATE public.orders
    SET
      invoice_number = public.generate_order_invoice_number(),
      paid_at = COALESCE(orders.paid_at, v_order.effective_paid_at)
    WHERE id = v_order.id;
  END LOOP;
END $$;

UPDATE public.orders
SET paid_at = COALESCE(paid_at, created_at)
WHERE status = 'paid'
  AND paid_at IS NULL;

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

COMMIT;
