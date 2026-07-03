-- Swap the home HERO media from the static NBcover image to an embedded YouTube video.
--
-- The seeded home hero (migration 010) renders a "Why teams switch / 100% Lighthouse"
-- card in its right column whose last element is an <img src="/images/NBcover.webp" />.
-- This replaces just that <img> with a responsive 16:9 YouTube <iframe>, keeping the
-- surrounding card, its rounded/border/shadow wrapper, and every other block intact.
--
-- Rendering path: the hero right column is a 'text' block; TextBlockRenderer feeds the
-- html_content through html-react-parser, which preserves <iframe> (it only strips on*
-- handlers and swaps known CMS <img> for next/image). The proxy.ts CSP frame-src already
-- allows https://www.youtube.com, so the embed is not blocked.
--
-- Forward-only and idempotent:
--   * Each UPDATE matches the language-specific <img> alt text, so a second run finds no
--     match and is a no-op (the alt text no longer exists once swapped).
--   * String replace on content::text mirrors migration 042; the img markup is unique to
--     the home hero, so exactly the EN and FR home hero blocks are touched.
--
-- The NBcover.webp media row is left untouched — it is still the feature image for the
-- "how-nextblock-works" post; only the inline hero usage changes.

-- ---------------------------------------------------------------------------
-- 1. EN home hero: replace NBcover <img> with a YouTube <iframe>
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = replace(
                content::text,
                '<img src=''/images/NBcover.webp'' alt=''Nextblock cover showcasing dashboards and blocks'' class=''w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700'' fetchpriority=''high'' />',
                '<div class=''relative w-full aspect-video''><iframe class=''absolute inset-0 h-full w-full border-0'' src=''https://www.youtube.com/embed/71MyfoL4YVM?si=jtlDXV6cSC8rDgz0'' title=''NextBlock demo video'' allow=''accelerated-motion; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'' referrerpolicy=''strict-origin-when-cross-origin'' loading=''lazy'' allowfullscreen></iframe></div>'
              )::jsonb
WHERE content::text LIKE '%Nextblock cover showcasing dashboards and blocks%';

-- ---------------------------------------------------------------------------
-- 2. FR home hero: replace NBcover <img> with a YouTube <iframe>
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = replace(
                content::text,
                '<img src=''/images/NBcover.webp'' alt=''Couverture Nextblock'' class=''w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700'' fetchpriority=''high'' />',
                '<div class=''relative w-full aspect-video''><iframe class=''absolute inset-0 h-full w-full border-0'' src=''https://www.youtube.com/embed/71MyfoL4YVM?si=jtlDXV6cSC8rDgz0'' title=''Vidéo de démonstration NextBlock'' allow=''accelerated-motion; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'' referrerpolicy=''strict-origin-when-cross-origin'' loading=''lazy'' allowfullscreen></iframe></div>'
              )::jsonb
WHERE content::text LIKE '%Couverture Nextblock%';
