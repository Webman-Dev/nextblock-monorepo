-- 00000000000006_home_sandbox_promo.sql
-- Adds a "Live Demo" promo section to the English (slug 'home') and French
-- (slug 'accueil') home pages that drives visitors to the public sandbox at
-- https://cms.nextblock.dev -- production (nextblock.dev) never mentioned it before.
--
-- The section is inserted right after the hero (order 1); existing home-page blocks
-- shift down by one so relative order is preserved. Each block carries a sentinel
-- comment (nb-sandbox-promo) inside its HTML so the sandbox reset route can strip it
-- there: a CTA pointing at the sandbox is pointless *inside* the sandbox itself.
--
-- Forward-only and idempotent: the NOT EXISTS sentinel guard makes a re-run a no-op,
-- and page lookups are by (language code, slug) so explicit IDs never collide with
-- user-created blocks on a live database.

DO $body$
DECLARE
  v_en_lang integer;
  v_fr_lang integer;
  v_en_page integer;
  v_fr_page integer;
BEGIN
  SELECT id INTO v_en_lang FROM public.languages WHERE code = 'en' LIMIT 1;
  SELECT id INTO v_fr_lang FROM public.languages WHERE code = 'fr' LIMIT 1;

  -- English home page
  SELECT id INTO v_en_page
    FROM public.pages
   WHERE slug = 'home' AND language_id = v_en_lang
   ORDER BY id
   LIMIT 1;

  IF v_en_page IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blocks
     WHERE page_id = v_en_page AND content::text LIKE '%nb-sandbox-promo%'
  ) THEN
    UPDATE public.blocks
       SET "order" = "order" + 1
     WHERE page_id = v_en_page AND "order" >= 1;

    INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
    VALUES (v_en_page, v_en_lang, 'section', $en$
{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#020817","position":0},{"color":"#0b1e3d","position":50},{"color":"#0e2a4d","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"xl","vertical_alignment":"center","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<!--nb-sandbox-promo--><p class='text-xs uppercase tracking-[0.25em] text-cyan-400 font-bold mb-4'>Live Demo &middot; No Signup</p><h2 class='text-4xl md:text-5xl font-bold text-white mb-6 leading-tight'>Try the full CMS,<br/>live right now.</h2><p class='text-lg text-slate-300 max-w-xl leading-relaxed mb-8'>Don't just read about NextBlock&trade; &mdash; take the wheel. Our public sandbox is a complete, pre-loaded install where you can build pages with the block editor, manage bilingual content, and browse a working demo store. It resets every hour, so explore freely and break whatever you like.</p>"}},{"block_type":"text","content":{"html_content":"<div class='flex flex-col sm:flex-row gap-4'><a href='https://cms.nextblock.dev' target='_blank' rel='noopener noreferrer' class='inline-flex items-center justify-center gap-2 rounded-xl px-7 h-12 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 transition-all no-underline'>Explore the Live Demo &rarr;</a><a href='https://cms.nextblock.dev/sign-in' target='_blank' rel='noopener noreferrer' class='inline-flex items-center justify-center gap-2 rounded-xl px-7 h-12 text-sm font-semibold text-white border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all no-underline'>Open the CMS Dashboard &rarr;</a></div><p class='text-xs text-slate-400 mt-4'>Demo login <span class='font-mono text-slate-300'>demo@nextblock.ca</span> / <span class='font-mono text-slate-300'>password</span> &middot; Resets hourly</p>"}}],[{"block_type":"text","content":{"html_content":"<div class='rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl'><div class='flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5'><span class='w-3 h-3 rounded-full bg-red-400/70'></span><span class='w-3 h-3 rounded-full bg-yellow-400/70'></span><span class='w-3 h-3 rounded-full bg-green-400/70'></span><span class='ml-3 flex-1 truncate rounded-md bg-black/30 px-3 py-1 text-xs font-mono text-slate-300'>cms.nextblock.dev</span></div><div class='p-6 sm:p-8'><p class='text-sm text-slate-300 mb-5'>A living NextBlock&trade; install &mdash; everything here is real and clickable:</p><ul class='space-y-4 text-sm text-slate-200'><li class='flex items-start gap-3'><span class='mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-xs'>&#10003;</span><span><strong class='text-white'>Full block editor</strong> with slash commands &amp; drag-and-drop.</span></li><li class='flex items-start gap-3'><span class='mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-xs'>&#10003;</span><span><strong class='text-white'>Bilingual</strong> English / French content management.</span></li><li class='flex items-start gap-3'><span class='mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-xs'>&#10003;</span><span><strong class='text-white'>A complete demo storefront</strong> with live checkout.</span></li><li class='flex items-start gap-3'><span class='mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-xs'>&#10003;</span><span><strong class='text-white'>Wipes clean every hour</strong> &mdash; always a fresh start.</span></li></ul></div></div>"}}]]}
$en$::jsonb, 1);
  END IF;

  -- French home page
  SELECT id INTO v_fr_page
    FROM public.pages
   WHERE slug = 'accueil' AND language_id = v_fr_lang
   ORDER BY id
   LIMIT 1;

  IF v_fr_page IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blocks
     WHERE page_id = v_fr_page AND content::text LIKE '%nb-sandbox-promo%'
  ) THEN
    UPDATE public.blocks
       SET "order" = "order" + 1
     WHERE page_id = v_fr_page AND "order" >= 1;

    INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
    VALUES (v_fr_page, v_fr_lang, 'section', $fr$
{"container_type":"container","background":{"type":"gradient","gradient":{"type":"linear","direction":"135deg","stops":[{"color":"#020817","position":0},{"color":"#0b1e3d","position":50},{"color":"#0e2a4d","position":100}]}},"responsive_columns":{"mobile":1,"tablet":1,"desktop":2},"column_gap":"xl","vertical_alignment":"center","padding":{"top":"xl","bottom":"xl"},"column_blocks":[[{"block_type":"text","content":{"html_content":"<!--nb-sandbox-promo--><p class='text-xs uppercase tracking-[0.25em] text-cyan-400 font-bold mb-4'>D&eacute;mo en direct &middot; Sans inscription</p><h2 class='text-4xl md:text-5xl font-bold text-white mb-6 leading-tight'>Essayez le CMS complet,<br/>en direct d&egrave;s maintenant.</h2><p class='text-lg text-slate-300 max-w-xl leading-relaxed mb-8'>Ne vous contentez pas de lire &agrave; propos de NextBlock&trade; &mdash; prenez les commandes. Notre bac &agrave; sable public est une installation compl&egrave;te et pr&eacute;charg&eacute;e o&ugrave; vous pouvez cr&eacute;er des pages avec l'&eacute;diteur de blocs, g&eacute;rer du contenu bilingue et parcourir une vraie boutique de d&eacute;monstration. Il se r&eacute;initialise chaque heure : explorez librement et cassez tout ce que vous voulez.</p>"}},{"block_type":"text","content":{"html_content":"<div class='flex flex-col sm:flex-row gap-4'><a href='https://cms.nextblock.dev' target='_blank' rel='noopener noreferrer' class='inline-flex items-center justify-center gap-2 rounded-xl px-7 h-12 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 transition-all no-underline'>D&eacute;couvrir la d&eacute;mo &rarr;</a><a href='https://cms.nextblock.dev/sign-in' target='_blank' rel='noopener noreferrer' class='inline-flex items-center justify-center gap-2 rounded-xl px-7 h-12 text-sm font-semibold text-white border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all no-underline'>Ouvrir le tableau de bord &rarr;</a></div><p class='text-xs text-slate-400 mt-4'>Identifiants d&eacute;mo <span class='font-mono text-slate-300'>demo@nextblock.ca</span> / <span class='font-mono text-slate-300'>password</span> &middot; R&eacute;initialis&eacute; chaque heure</p>"}}],[{"block_type":"text","content":{"html_content":"<div class='rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl'><div class='flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5'><span class='w-3 h-3 rounded-full bg-red-400/70'></span><span class='w-3 h-3 rounded-full bg-yellow-400/70'></span><span class='w-3 h-3 rounded-full bg-green-400/70'></span><span class='ml-3 flex-1 truncate rounded-md bg-black/30 px-3 py-1 text-xs font-mono text-slate-300'>cms.nextblock.dev</span></div><div class='p-6 sm:p-8'><p class='text-sm text-slate-300 mb-5'>Une installation NextBlock&trade; bien vivante &mdash; tout ici est r&eacute;el et cliquable :</p><ul class='space-y-4 text-sm text-slate-200'><li class='flex items-start gap-3'><span class='mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-xs'>&#10003;</span><span><strong class='text-white'>&Eacute;diteur de blocs complet</strong> : commandes slash et glisser-d&eacute;poser.</span></li><li class='flex items-start gap-3'><span class='mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-xs'>&#10003;</span><span><strong class='text-white'>Gestion bilingue</strong> du contenu fran&ccedil;ais / anglais.</span></li><li class='flex items-start gap-3'><span class='mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-xs'>&#10003;</span><span><strong class='text-white'>Une boutique de d&eacute;monstration compl&egrave;te</strong> avec paiement r&eacute;el.</span></li><li class='flex items-start gap-3'><span class='mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-xs'>&#10003;</span><span><strong class='text-white'>Remis &agrave; z&eacute;ro chaque heure</strong> &mdash; toujours un nouveau d&eacute;part.</span></li></ul></div></div>"}}]]}
$fr$::jsonb, 1);
  END IF;
END
$body$;
