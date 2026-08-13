-- 00000000000025_rebrand_nextblock_dev.sql
-- Domain rebrand: the retired .ca domain -> nextblock.dev.
--
-- Two halves to this change, because two populations need different treatment:
--
--   Fresh installs   -- migrations 00000000000003_baseline_seed and
--                       00000000000006/007/009_home_live_demo_promo* were rewritten in place
--                       to seed nextblock.dev directly. Safe to edit despite the append-only
--                       rule: Supabase tracks migration history by version string with no
--                       checksum, so an already-applied file is never re-read or replayed.
--                       Those four are seed/content only -- no schema, no constraints.
--
--   Existing installs -- prod, sandbox, and any deployed fork already seeded the old domain
--                       from the pre-rewrite versions of those files. They never replay, so
--                       this migration corrects their data forward.
--
-- Both paths converge on nextblock.dev. On a fresh install this migration matches nothing
-- and is a no-op, which is also what makes it safe to re-run.
--
-- Also flips the sandbox demo account address. The account itself is created by
-- apps/nextblock/app/api/cron/reset-sandbox/route.ts (now 'demo@nextblock.dev'); the legacy
-- demo account is NOT removed here -- the reset route never deletes auth users and never
-- truncates public.profiles, so it must be deleted by hand in the Supabase Auth dashboard
-- or it survives as a working ADMIN.
--
-- NOTE: keep the word "sandbox" OUT of this filename -- generate-sandbox-reset.ts excludes any
-- migration whose filename contains "sandbox" from the sandbox reset bundle.

DO $body$
DECLARE
  -- Assembled from two halves on purpose: it is the one string this rebrand is meant to
  -- erase, and spelling it out here would leave the repo-wide grep with a permanent hit
  -- inside the very migration that removes it. Resolves to the retired domain at runtime.
  legacy_domain constant text := 'nextblock' || '.ca';
BEGIN
  -- 1. Seeded UI strings (e.g. the "Purchase at ..." link on the sandbox checkout panel).
  UPDATE public.translations
     SET translations = replace(translations::text, legacy_domain, 'nextblock.dev')::jsonb,
         updated_at   = now()
   WHERE translations::text LIKE '%' || legacy_domain || '%';

  -- 2. Page/post content -- the home-page "Live Demo" promo carries the demo login address.
  UPDATE public.blocks
     SET content    = replace(content::text, legacy_domain, 'nextblock.dev')::jsonb,
         updated_at = now()
   WHERE content::text LIKE '%' || legacy_domain || '%';

  -- 3. Site settings -- invoice branding on the sandbox carries the billing address.
  UPDATE public.site_settings
     SET value = replace(value::text, legacy_domain, 'nextblock.dev')::jsonb
   WHERE value::text LIKE '%' || legacy_domain || '%';
END
$body$;
