-- Purchase enquiries raised when the store cannot take payment.
--
-- A NextBlock store can be fully built — products, prices, images, pages — while its
-- Stripe or Freemius credentials are still missing. Until this migration the only
-- symptom was a shopper reaching checkout and receiving the payment provider's raw
-- rejection ("Invalid API Key provided: sk_test_*ummy"), which tells them nothing and
-- loses the sale outright.
--
-- The storefront now offers those shoppers an enquiry form in place of Add-to-Cart,
-- and every submission lands here. The row is the product, not the email: SMTP is a
-- separate piece of setup that the same half-configured store has usually also not
-- done, so a notification that cannot be sent must never be the only record. The
-- `email_delivered` flag records whether the owner was successfully notified; false
-- means "read this in the CMS, nobody got a mail about it".
--
-- SECURITY POSTURE. Rows hold visitor-supplied PII (name, email, free text) plus a
-- masked IP. There is deliberately NO anon policy of any kind: anonymous visitors
-- neither read nor write this table directly. The public server action inserts with
-- the service-role client after bot-protection and throttle checks, exactly as
-- `privacy_consent_logs` does — that keeps the insert shape server-controlled and
-- means a leaked anon key cannot enumerate or seed enquiries. ADMINs read; nobody
-- else does, because these are sales leads and personal data.
--
-- `product_id` is a PLAIN uuid with NO foreign key, following site_script_revisions:
-- an enquiry is evidence that someone wanted a product, and deleting the product
-- should not delete or rewrite that evidence. `product_slug` and `product_title` are
-- denormalised so a deleted product is still identifiable in the list.
--
-- Forward-only and idempotent.

CREATE TABLE IF NOT EXISTS public.product_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    -- No FK by design (see header). Null when the product was deleted after the fact.
    product_id uuid,
    product_slug text,
    product_title text,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    message text NOT NULL,
    -- Which language the visitor was browsing in, so the owner can reply in kind.
    locale text,
    ip_masked text,
    user_agent text,
    -- False when SMTP was unconfigured or the send failed: the CMS list is then the
    -- only place this enquiry exists.
    email_delivered boolean DEFAULT false NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_inquiries_pkey PRIMARY KEY (id),
    CONSTRAINT product_inquiries_sender_name_not_blank CHECK ((char_length(btrim(sender_name)) > 0)),
    CONSTRAINT product_inquiries_sender_email_not_blank CHECK ((char_length(btrim(sender_email)) > 0)),
    CONSTRAINT product_inquiries_message_not_blank CHECK ((char_length(btrim(message)) > 0))
);

COMMENT ON TABLE public.product_inquiries IS 'Visitor purchase enquiries raised when the store cannot take payment. Written by the service role from a public server action; read by ADMINs only.';

COMMENT ON COLUMN public.product_inquiries.product_id IS 'Plain uuid, no FK: an enquiry outlives the product it was about.';

COMMENT ON COLUMN public.product_inquiries.ip_masked IS 'Partially masked IP (e.g. 203.0.113.x) - never store a full address. Also backs the per-IP submission throttle.';

COMMENT ON COLUMN public.product_inquiries.email_delivered IS 'False when the owner notification could not be sent (e.g. SMTP unconfigured); the stored row is then the only record.';

-- Newest-first is the only listing order the CMS needs.
CREATE INDEX IF NOT EXISTS product_inquiries_created_idx
    ON public.product_inquiries USING btree (created_at DESC);

-- Backs the throttle lookup in the public server action: count recent rows per IP.
CREATE INDEX IF NOT EXISTS product_inquiries_ip_created_idx
    ON public.product_inquiries USING btree (ip_masked, created_at DESC);

-- Lets the CMS count outstanding enquiries without scanning resolved history.
CREATE INDEX IF NOT EXISTS product_inquiries_unresolved_idx
    ON public.product_inquiries USING btree (created_at DESC)
    WHERE (is_resolved = false);

ALTER TABLE public.product_inquiries ENABLE ROW LEVEL SECURITY;

-- anon is deliberately absent: the public path goes through the service role.
GRANT SELECT, UPDATE ON TABLE public.product_inquiries TO authenticated;
GRANT ALL ON TABLE public.product_inquiries TO service_role;

DROP POLICY IF EXISTS product_inquiries_admin_read_policy ON public.product_inquiries;
CREATE POLICY product_inquiries_admin_read_policy ON public.product_inquiries FOR SELECT TO authenticated USING ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role));

-- ADMINs may only flip the resolved flag; the enquiry content itself is a record.
DROP POLICY IF EXISTS product_inquiries_admin_update_policy ON public.product_inquiries;
CREATE POLICY product_inquiries_admin_update_policy ON public.product_inquiries FOR UPDATE TO authenticated USING ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role)) WITH CHECK ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS product_inquiries_service_role_policy ON public.product_inquiries;
CREATE POLICY product_inquiries_service_role_policy ON public.product_inquiries TO service_role USING (true) WITH CHECK (true);

-- Where enquiry notifications are sent. Kept in the PUBLIC settings row rather than the
-- secret one because it is an address, not a credential — but it is never rendered to
-- the storefront: the public form posts a product id and the server resolves the
-- recipient. Empty string means "fall back", see resolveSellerContactEmail().
INSERT INTO public.site_settings (key, value)
VALUES ('store_contact', '{"contactEmail": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Storefront copy for the enquiry flow. Public-facing, so it must be translatable;
-- the components pass an English literal as the fallback, so an install that never
-- runs this seed still renders correctly.
INSERT INTO public.translations (key, translations, created_at, updated_at) VALUES
    ('ecommerce.contact_seller', '{"en": "Contact the seller", "fr": "Contacter le vendeur"}', now(), now()),
    ('ecommerce.contact_seller_heading', '{"en": "Interested in this product?", "fr": "Ce produit vous intéresse ?"}', now(), now()),
    ('ecommerce.contact_seller_intro', '{"en": "Online ordering isn''t available for this item yet. Send the seller a message and they''ll get back to you about buying it.", "fr": "La commande en ligne n''est pas encore disponible pour cet article. Envoyez un message au vendeur et il vous répondra au sujet de son achat."}', now(), now()),
    ('ecommerce.contact_seller_name', '{"en": "Your name", "fr": "Votre nom"}', now(), now()),
    ('ecommerce.contact_seller_email', '{"en": "Your email", "fr": "Votre courriel"}', now(), now()),
    ('ecommerce.contact_seller_message', '{"en": "Message", "fr": "Message"}', now(), now()),
    ('ecommerce.contact_seller_send', '{"en": "Send message", "fr": "Envoyer le message"}', now(), now()),
    ('ecommerce.contact_seller_sending', '{"en": "Sending...", "fr": "Envoi..."}', now(), now()),
    ('ecommerce.contact_seller_sent', '{"en": "Thanks - your message has been sent to the seller. They''ll reply to the email address you gave.", "fr": "Merci - votre message a été envoyé au vendeur. Il répondra à l''adresse courriel que vous avez indiquée."}', now(), now()),
    ('ecommerce.contact_seller_error', '{"en": "Sorry, your message couldn''t be sent. Please try again in a moment.", "fr": "Désolé, votre message n''a pas pu être envoyé. Veuillez réessayer dans un instant."}', now(), now()),
    ('ecommerce.contact_seller_invalid', '{"en": "Please check your name, email address and message, then try again.", "fr": "Veuillez vérifier votre nom, votre adresse courriel et votre message, puis réessayer."}', now(), now()),
    ('ecommerce.contact_seller_throttled', '{"en": "You''ve sent several messages already. Please wait a few minutes before sending another.", "fr": "Vous avez déjà envoyé plusieurs messages. Veuillez patienter quelques minutes avant d''en envoyer un autre."}', now(), now()),
    ('ecommerce.not_available_for_purchase', '{"en": "Not available for online purchase", "fr": "Non disponible à l''achat en ligne"}', now(), now()),
    ('ecommerce.checkout_payments_unavailable', '{"en": "This store is not able to take payments right now. Please contact the seller to complete your purchase.", "fr": "Cette boutique ne peut pas accepter de paiements pour le moment. Veuillez contacter le vendeur pour finaliser votre achat."}', now(), now())
ON CONFLICT (key) DO NOTHING;
