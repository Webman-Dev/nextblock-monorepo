-- 00000000000032_neutralize_seeded_contact_emails.sql
-- Remove the original authors' contact addresses from seeded content so a
-- downloaded / self-hosted copy of NextBlock never routes mail to us.
--
-- Earlier migrations baked real addresses into block content:
--   * 00000000000027 seeded `privacy@nextblock.dev` across the Privacy Policy and
--     Terms pages (EN + FR), as visible text and `mailto:` links.
--   * 00000000000010 seeded a `mailto:info@nextblock.dev` CTA on the French home
--     page (the English page correctly links to /contact), and `foo@bar.com` as
--     the contact form recipient.
--
-- Migrations are append-only, so this is a forward-only data fix rather than an
-- edit of those files. Each statement is idempotent (a no-op once applied).
--
-- The `{{privacy_email}}` token is resolved at render time by the app
-- (apps/nextblock/lib/privacy/contact-emails.ts): admin "Support email" setting
-- -> SANDBOX_PRIVACY_EMAIL env (sandbox only) -> privacy@example.com fallback.

-- 1. Privacy / Terms legal pages: swap the hard-coded address for a merge tag.
UPDATE public.blocks
SET content = replace(content::text, 'privacy@nextblock.dev', '{{privacy_email}}')::jsonb
WHERE content::text LIKE '%privacy@nextblock.dev%';

-- 2. French home "Nous contacter" CTA: point at the contact form like the English
--    page instead of a mailto to our inbox.
UPDATE public.blocks
SET content = replace(content::text, 'mailto:info@nextblock.dev', '/contact')::jsonb
WHERE content::text LIKE '%mailto:info@nextblock.dev%';

-- 3. Contact form default recipient: use a neutral placeholder. In sandbox the
--    app overrides this with SANDBOX_CONTACT_EMAIL at submit time.
UPDATE public.blocks
SET content = replace(content::text, 'foo@bar.com', 'contact@example.com')::jsonb
WHERE content::text LIKE '%foo@bar.com%';
