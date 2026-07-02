-- Promote the one-click "Deploy to Vercel" button as a CTA in the seeded homepage.
--
-- Two placements per language, both rendered through the normal 'button' block
-- (ButtonBlockRenderer), so external URLs open in a new tab with rel=noopener:
--   1. Home HERO  — replace the secondary "View on GitHub" / "Voir sur GitHub"
--      outline button with a "Deploy on Vercel" / "Déployer sur Vercel" button
--      (same variant/size/position; the primary "Get Started" button is untouched,
--      and GitHub is still linked from the hero social row + the community section).
--   2. Home CLOSING CTA band ("Have Questions?" / "Des questions ?") — append a
--      secondary (outline) "Deploy on Vercel" button after the contact button so
--      the page also ends on the deploy action, styled to match the hero's Deploy
--      button and keep the filled "Get in Touch" button as the band's primary.
--
-- The canonical deploy URL is the exact href from the README's Deploy button
-- (native Supabase Marketplace `stores` flow). It is stored as a raw button `url`
-- value (literal '&', not '&amp;') because the renderer uses it directly as an href.
--
-- Forward-only and idempotent:
--   * The hero swap matches the old button label, so a second run is a no-op
--     (the label no longer exists) and it silently skips any install where the
--     button was already customized or removed.
--   * The closing-band append is guarded by NOT LIKE '%Deploy on Vercel%' /
--     '%Déployer sur Vercel%', so it never appends twice.
-- Scoping is by unique block text, so exactly the home hero / closing band match.

-- ---------------------------------------------------------------------------
-- 1a. EN home hero: "View on GitHub" -> "Deploy on Vercel"
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = replace(
                replace(content::text, '"View on GitHub"', '"Deploy on Vercel"'),
                '"https://github.com/nextblock-cms/nextblock"',
                '"https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&project-name=nextblock&repository-name=nextblock&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D"'
              )::jsonb
WHERE content::text LIKE '%"View on GitHub"%';

-- ---------------------------------------------------------------------------
-- 1b. FR home hero: "Voir sur GitHub" -> "Déployer sur Vercel"
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = replace(
                replace(content::text, '"Voir sur GitHub"', '"Déployer sur Vercel"'),
                '"https://github.com/nextblock-cms/nextblock"',
                '"https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&project-name=nextblock&repository-name=nextblock&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D"'
              )::jsonb
WHERE content::text LIKE '%"Voir sur GitHub"%';

-- ---------------------------------------------------------------------------
-- 2a. EN home closing band ("Have Questions?"): append a Deploy on Vercel button
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = jsonb_set(
                content,
                '{column_blocks,0}',
                (content #> '{column_blocks,0}') ||
                '[{"block_type":"button","content":{"text":"Deploy on Vercel","url":"https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&project-name=nextblock&repository-name=nextblock&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D","variant":"outline","size":"lg","position":"center"}}]'::jsonb
              )
WHERE content::text LIKE '%Have Questions?%'
  AND content::text NOT LIKE '%Deploy on Vercel%';

-- ---------------------------------------------------------------------------
-- 2b. FR home closing band ("Des questions ?"): append a Déployer sur Vercel button
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = jsonb_set(
                content,
                '{column_blocks,0}',
                (content #> '{column_blocks,0}') ||
                '[{"block_type":"button","content":{"text":"Déployer sur Vercel","url":"https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&project-name=nextblock&repository-name=nextblock&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D","variant":"outline","size":"lg","position":"center"}}]'::jsonb
              )
WHERE content::text LIKE '%Des questions ?%'
  AND content::text NOT LIKE '%Déployer sur Vercel%';
