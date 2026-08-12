-- 00000000000024_updating_article_newline_fix.sql
-- Repairs two mistakes made by 00000000000023 in the "How Updating NextBlock Works"
-- article, and lands the FAQ entry that migration failed to insert.
--
-- 1. RENDERING BUG. 023 wrote `\n` inside ordinary single-quoted SQL literals. With
--    standard_conforming_strings on (the default), that is a literal backslash followed
--    by 'n' — not a newline — so five visible "\n" sequences were stored in the article
--    body. Replaced here with real newlines via chr(10). Idempotent: once none remain,
--    replace() is a no-op.
--
-- 2. SILENT NO-MATCH. 023's FAQ replacement targeted a string spanning `</h3>\n<p>`, and
--    for the same reason the literal never matched the real newline in the stored HTML, so
--    the replacement quietly did nothing. Redone here by anchoring on the single-line <h3>
--    alone and prepending the new entry — no newline in either the search or the
--    replacement, which is the rule this file establishes for editing the article.
--
-- Data-only; no schema change.

DO $body$
DECLARE
  v_en_post integer;
  v_fr_post integer;
BEGIN
  SELECT id INTO v_en_post
    FROM public.posts WHERE language_id = 1 AND slug = 'how-updating-works'
   ORDER BY id LIMIT 1;

  SELECT id INTO v_fr_post
    FROM public.posts WHERE language_id = 2 AND slug = 'comment-fonctionnent-les-mises-a-jour'
   ORDER BY id LIMIT 1;

  IF v_en_post IS NOT NULL THEN
    UPDATE public.blocks
       SET content = jsonb_set(
             content,
             '{html_content}',
             to_jsonb(
               replace(
                 -- (1) literal backslash-n -> real newline
                 replace(content->>'html_content', E'\\n', chr(10)),
                 -- (2) the FAQ entry 023 failed to insert
                 '<h3>I am on the one-click Vercel deploy &mdash; do I need to run anything?</h3>',
                 '<h3>I deployed to Vercel, but from <code>npm create nextblock</code>. Is that automatic too?</h3><p>No &mdash; and this is the distinction that catches people out. Automatic updates depend on your repository being the NextBlock <strong>monorepo</strong>, not on where the site is hosted. A project scaffolded by the CLI is the flattened standalone app whatever you deploy it to, so it updates with <code>npm run update</code>. You will not see the <strong>Connect GitHub</strong> step on that kind of install, because the workflow it installs would merge a completely different source tree into yours.</p><h3>I am on the one-click Vercel deploy &mdash; do I need to run anything?</h3>'
               )
             )
           ),
           updated_at = now()
     WHERE post_id = v_en_post
       AND block_type = 'text';
  END IF;

  IF v_fr_post IS NOT NULL THEN
    UPDATE public.blocks
       SET content = jsonb_set(
             content,
             '{html_content}',
             to_jsonb(
               replace(
                 replace(content->>'html_content', E'\\n', chr(10)),
                 '<h3>Je suis sur le d&eacute;ploiement Vercel en un clic &mdash; dois-je lancer quelque chose ?</h3>',
                 '<h3>J''ai d&eacute;ploy&eacute; sur Vercel, mais depuis <code>npm create nextblock</code>. Est-ce automatique aussi ?</h3><p>Non &mdash; et c''est la distinction qui pi&egrave;ge le plus. Les mises &agrave; jour automatiques d&eacute;pendent du fait que votre d&eacute;p&ocirc;t soit le <strong>monorepo</strong> NextBlock, pas de l''endroit o&ugrave; le site est h&eacute;berg&eacute;. Un projet g&eacute;n&eacute;r&eacute; par le CLI reste l''application autonome aplatie, quel que soit l''h&eacute;bergeur : il se met &agrave; jour avec <code>npm run update</code>. L''&eacute;tape <strong>Connect GitHub</strong> ne s''affiche pas sur ce type d''installation, car le workflow qu''elle installe fusionnerait une arborescence totalement diff&eacute;rente dans la v&ocirc;tre.</p><h3>Je suis sur le d&eacute;ploiement Vercel en un clic &mdash; dois-je lancer quelque chose ?</h3>'
               )
             )
           ),
           updated_at = now()
     WHERE post_id = v_fr_post
       AND block_type = 'text';
  END IF;
END
$body$;
