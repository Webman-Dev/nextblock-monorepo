-- 00000000000013_youtube_nocookie_embeds.sql
--
-- Lighthouse Best Practices scored 96 instead of 100: the `inspector-issues` audit
-- (binary, weight 1 of 27 -> 26/27 = 96) failed with a DevTools "Cookie" issue
-- attributed to www.youtube.com/embed/71MyfoL4YVM. The seeded home-page hero and the
-- seeded articles embed raw <iframe> markup pointing at www.youtube.com, whose player
-- writes cookies on load.
--
-- The real fix is the render-time click-to-play facade added in
-- apps/nextblock/components/media/YouTubeFacade.tsx (the nocookie host does NOT stop
-- the player's document.cookie writes -- only not loading the player does). This
-- migration is the data-hygiene half: it rewrites every stored embed to the
-- privacy-enhanced host so any surface that still renders a raw iframe (published-lib
-- renderers, CMS previews, exports, downstream installs on an older app build) is at
-- least cookie-reduced, and so the stored content matches what we ship.
--
-- It also fixes the bogus Permissions Policy feature in the seeded allow attribute:
-- 'accelerated-motion' is not a real feature (Chrome logs "Unrecognized feature");
-- the canonical YouTube embed uses 'accelerometer'.
--
-- Append-only: 00000000000003_baseline_seed.sql is applied everywhere and is NOT edited.
-- Scoped by CONTENT MATCH, never by block id -- ids drift on installs where the demo
-- content was re-created (see the convention documented in 00000000000006:11-13 and
-- used by 007/009). This is a pure host-substring swap, so it never clobbers a user's
-- edited copy, it also repairs author-pasted embeds, and it is naturally idempotent
-- (a second run matches zero rows) which matters because the nightly sandbox reset
-- replays the whole migration chain from a truncated history.
--
-- No dollar-quoting is needed here: neither search nor replacement literal contains a
-- single quote, and neither contains a JSON metacharacter, so the ::text round-trip
-- always re-parses as valid JSON. Query strings (?si=...) are preserved.
--
-- NOTE: keep the word "sandbox" OUT of this filename -- generate-sandbox-reset.ts
-- excludes any migration whose filename contains "sandbox".

-- 1. Live page/post block content (the 4 seeded rows + any author-added embed).
UPDATE public.blocks
   SET content = replace(
         replace(content::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE content IS NOT NULL
   AND (content::text LIKE '%www.youtube.com/embed/%'
        OR content::text LIKE '%accelerated-motion%');

-- 2. Live Draft Mode snapshots. Publishing a pre-existing draft would otherwise write
--    the cookie host straight back into public.blocks.
UPDATE public.content_drafts
   SET blocks = replace(
         replace(blocks::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE blocks::text LIKE '%www.youtube.com/embed/%'
    OR blocks::text LIKE '%accelerated-motion%';

UPDATE public.content_drafts
   SET meta = replace(
         replace(meta::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE meta::text LIKE '%www.youtube.com/embed/%'
    OR meta::text LIKE '%accelerated-motion%';

UPDATE public.product_drafts
   SET blocks = replace(
         replace(blocks::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE blocks::text LIKE '%www.youtube.com/embed/%'
    OR blocks::text LIKE '%accelerated-motion%';

-- product_drafts.meta carries short_description / description_json.
UPDATE public.product_drafts
   SET meta = replace(
         replace(meta::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE meta::text LIKE '%www.youtube.com/embed/%'
    OR meta::text LIKE '%accelerated-motion%';

-- 3. Revision history. apps/nextblock/app/cms/revisions/service.ts replays a snapshot
--    verbatim, so one "Restore version" click would otherwise reintroduce the issue.
--    URL-only rewrite; nothing else about the historical snapshot is touched.
UPDATE public.page_revisions
   SET content = replace(
         replace(content::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE content::text LIKE '%www.youtube.com/embed/%'
    OR content::text LIKE '%accelerated-motion%';

UPDATE public.post_revisions
   SET content = replace(
         replace(content::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE content::text LIKE '%www.youtube.com/embed/%'
    OR content::text LIKE '%accelerated-motion%';

-- 4. Product rich text rendered on public /product/* routes.
UPDATE public.products
   SET short_description = replace(
         replace(short_description, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )
 WHERE short_description IS NOT NULL
   AND (short_description LIKE '%www.youtube.com/embed/%'
        OR short_description LIKE '%accelerated-motion%');

UPDATE public.products
   SET description_json = replace(
         replace(description_json::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE description_json IS NOT NULL
   AND (description_json::text LIKE '%www.youtube.com/embed/%'
        OR description_json::text LIKE '%accelerated-motion%');

-- 5. Custom block definitions (rich-text defaults / emptyFallback markup rendered by
--    DynamicLayoutEngine). Host-only swap, so the is_valid_custom_block_* CHECK
--    constraints still hold. No-op on a fresh install.
UPDATE public.custom_block_definitions
   SET fields = replace(
         replace(fields::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE fields::text LIKE '%www.youtube.com/embed/%'
    OR fields::text LIKE '%accelerated-motion%';

UPDATE public.custom_block_definitions
   SET layout_schema = replace(
         replace(layout_schema::text, 'www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/'),
         'accelerated-motion', 'accelerometer'
       )::jsonb
 WHERE layout_schema::text LIKE '%www.youtube.com/embed/%'
    OR layout_schema::text LIKE '%accelerated-motion%';
