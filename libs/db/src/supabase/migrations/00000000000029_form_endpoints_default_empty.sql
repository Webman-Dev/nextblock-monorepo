-- A contact form has no address of its own by default.
--
-- The starter content ships a contact page addressed to `contact@example.com`, and
-- migration 27 faithfully carried that placeholder into `form_endpoints`. Faithful was
-- the wrong call. `example.com` is reserved by RFC 2606 precisely so it can never be
-- registered, so the address is not merely unhelpful — it is guaranteed undeliverable,
-- while looking like a real setting to every layer downstream. The visitor is thanked,
-- the relay accepts the message, and nobody is ever notified. Nothing errors, so an
-- install can run that way indefinitely.
--
-- Since the messaging system arrived, a per-form address is not something an operator
-- needs to think about at all. Submissions are stored as threads and answered in
-- CMS → Messages; the notification address is a single site-wide setting, and a form
-- only carries its own address when someone deliberately wants that form routed
-- elsewhere (a careers form to HR, say).
--
-- So the default becomes NULL, meaning "use the site contact address", which resolves
-- to the address set in CMS → Messages and finally to the first admin's own login. An
-- install therefore reaches a real human out of the box without configuring anything.
--
-- The sandbox is unaffected: `resolveFormRecipient` overrides everything with
-- SANDBOX_CONTACT_EMAIL when NEXT_PUBLIC_IS_SANDBOX is set, so the hosted demo keeps
-- routing to the operator's own inbox without storing an address here.
--
-- Forward-only and idempotent.

-- Reserved domains from RFC 2606 / RFC 6761. Matching on the domain rather than the
-- exact seeded string also catches an operator who typed their own placeholder.
UPDATE public.form_endpoints
   SET recipient_email = NULL
 WHERE recipient_email IS NOT NULL
   AND (
     lower(recipient_email) LIKE '%@example.com'
     OR lower(recipient_email) LIKE '%@example.org'
     OR lower(recipient_email) LIKE '%@example.net'
     OR lower(recipient_email) LIKE '%@example.edu'
     OR lower(recipient_email) LIKE '%.example'
     OR lower(recipient_email) LIKE '%.invalid'
     OR lower(recipient_email) LIKE '%.test'
     OR lower(recipient_email) LIKE '%.localhost'
     OR lower(recipient_email) LIKE '%.local'
   );

COMMENT ON COLUMN public.form_endpoints.recipient_email IS 'Per-form override. NULL means "use the site contact address" (CMS -> Messages, falling back to the first admin), which is the default and the usual case.';

-- Same reasoning for the site-wide rows: a placeholder there is worse than an empty
-- value, because an empty one falls through to the first admin and actually arrives.
UPDATE public.site_settings
   SET value = jsonb_set(value, '{contactEmail}', '""'::jsonb)
 WHERE key IN ('forms_contact', 'store_contact')
   AND value ? 'contactEmail'
   AND lower(value->>'contactEmail') LIKE '%@example.%';
