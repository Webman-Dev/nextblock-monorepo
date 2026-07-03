-- Swap the Nx-graph image in the "How NextBlock™ Works" article for an embedded
-- YouTube video, and rebalance that two-column section to an even 50/50 split.
--
-- Targets the post-body 'text' block (dollar-quoted html_content seeded in migration
-- 010) for both language variants of the same post:
--   * EN  slug how-nextblock-works           (img alt "Nx project graph preview ...")
--   * FR  slug comment-nextblock-fonctionne  (img alt "Apercu du graphe Nx ...")
--
-- Three forward-only, idempotent edits:
--   1. Column widths md:w-3/5 (text) and md:w-2/5 (media) -> md:w-1/2 each, and the
--      flex row switches items-start -> items-center so the shorter media column sits
--      centered against the taller text column. These class fragments occur only in
--      this one section (EN + FR), so a single UPDATE rebalances both languages.
--   2/3. Replace the <img src="/images/nx-graph.webp" ...> with a responsive 16:9
--      YouTube <iframe>, kept inside the existing white aside card above its caption.
--
-- Rendering/CSP identical to migration 043: TextBlockRenderer -> html-react-parser
-- preserves the <iframe>; proxy.ts CSP frame-src allows www.youtube.com; every utility
-- class used here lives in this .sql file, which Tailwind's content scanner
-- (libs/**/*.sql) compiles into the bundle. The nx-graph.webp media row is left intact.
--
-- Each UPDATE is guarded by a substring that only exists pre-swap, so a second run is a
-- no-op. Dollar-quoted string literals ($old$/$new$) avoid escaping the single-quoted
-- HTML attributes; the sandbox reset runs this via postgres db.unsafe() (no outer
-- dollar-quote wrapper), same as migration 010's dollar-quoted seed content.

-- ---------------------------------------------------------------------------
-- 1. Both languages: 3/5 + 2/5 columns -> 50/50, and vertical-center the row
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = replace(
                replace(
                  replace(
                    content::text,
                    'flex flex-col md:flex-row gap-8 items-start my-12',
                    'flex flex-col md:flex-row gap-8 items-center my-12'
                  ),
                  'w-full md:w-3/5 space-y-4',
                  'w-full md:w-1/2 space-y-4'
                ),
                'md:w-2/5 rounded-[2rem]',
                'md:w-1/2 rounded-[2rem]'
              )::jsonb
WHERE content::text LIKE '%w-full md:w-3/5 space-y-4%';

-- ---------------------------------------------------------------------------
-- 2. EN post body: nx-graph <img> -> responsive YouTube <iframe>
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = replace(
                content::text,
                $old$<img src='/images/nx-graph.webp' alt='Nx project graph preview showing apps and shared libraries linked together' class='w-full h-auto rounded-2xl object-cover' />$old$,
                $new$<div class='relative aspect-video overflow-hidden rounded-2xl'><iframe class='absolute inset-0 h-full w-full border-0' src='https://www.youtube.com/embed/DNqU8ez9qjs?si=p2oIy0f-n7wiaBmO' title='How NextBlock™ Works' allow='accelerated-motion; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' referrerpolicy='strict-origin-when-cross-origin' loading='lazy' allowfullscreen></iframe></div>$new$
              )::jsonb
WHERE content::text LIKE '%Nx project graph preview showing apps and shared libraries linked together%';

-- ---------------------------------------------------------------------------
-- 3. FR post body: nx-graph <img> -> responsive YouTube <iframe>
-- ---------------------------------------------------------------------------
UPDATE public.blocks
SET content = replace(
                content::text,
                $old$<img src='/images/nx-graph.webp' alt='Apercu du graphe Nx montrant les applications et librairies partagees' class='w-full h-auto rounded-2xl object-cover' />$old$,
                $new$<div class='relative aspect-video overflow-hidden rounded-2xl'><iframe class='absolute inset-0 h-full w-full border-0' src='https://www.youtube.com/embed/DNqU8ez9qjs?si=p2oIy0f-n7wiaBmO' title='Comment NextBlock™ fonctionne' allow='accelerated-motion; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' referrerpolicy='strict-origin-when-cross-origin' loading='lazy' allowfullscreen></iframe></div>$new$
              )::jsonb
WHERE content::text LIKE '%Apercu du graphe Nx montrant les applications et librairies partagees%';
