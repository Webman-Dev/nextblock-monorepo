-- 00000000000022_updating_article_accuracy.sql
-- Three accuracy fixes to the "How Updating NextBlock Works" article
-- (seeded in 00000000000020, first corrected in 00000000000021).
--
-- 0. The merge is performed with `git merge-file`, not `git apply --3way`. The latter
--    implies --index: it stages its result (so `git diff` shows the developer nothing),
--    requires every path to be tracked (one gitignored framework path aborted the whole
--    update), and requires the worktree to match the index. merge-file touches no git
--    state at all. Consequently the resolution commands 021 shipped are wrong: there are
--    no index stages, so `git checkout --theirs/--ours` does not apply. The conflict
--    markers are ordinary text; `git checkout -- <file>` discards one file's merge.
--
-- 1. "A conflicted merge is aborted automatically" was true of only ONE path. The
--    monorepo/fork path does abort and restore the tree, because the merge belongs to
--    upstream. The standalone path deliberately LEAVES the conflict in the working tree,
--    because it is the developer's own repository and resolving it is the whole point.
--    The bullet now states both.
-- 2. The Docker section claimed `npm run update` refreshes the schema. It does not, by
--    design: the self-hosted stack ships its own migration runner (the `migrate` service
--    in docker-compose.yml, which tracks applied versions in a different table), so the
--    updater stages the SQL and hands off to `npm run docker:up` rather than applying it
--    twice through two different trackers.
--
-- Same targeted, idempotent replace() approach as 021 — a no-op once the old sentence is
-- gone. Data-only; no schema change.

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
                 replace(
                   replace(
                     content->>'html_content',
                     -- 021 shipped index-based resolution commands; the merge no longer
                     -- uses the git index, so they do not apply.
                     '<strong>your edit is kept</strong>. The update merges the upstream change into your version, and only a change that genuinely overlaps yours conflicts, with ordinary <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; ours</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; theirs</code> markers. List them with <code>git diff --name-only --diff-filter=U</code> and resolve with <code>git checkout --theirs</code> or <code>--ours</code>.',
                     '<strong>your edit is kept</strong>. The update merges the upstream change into your version, and only a change that genuinely overlaps yours conflicts &mdash; the updater lists those files, and each one carries ordinary <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; your version</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; NextBlock</code> markers. Edit them as you would any conflict, or run <code>git checkout -- &lt;file&gt;</code> to discard the merge for that one file.'
                   ),
                   '<li><strong>A conflicted merge</strong> is aborted automatically &mdash; your working tree is left exactly as it was, with instructions printed for resolving it by hand.</li>',
                   '<li><strong>A conflict</strong> behaves differently by install, on purpose. On a fork or clone the upstream merge is <em>aborted</em> and your working tree is left exactly as it was. On a standalone project the conflict is <em>left in place</em> for you to resolve &mdash; it is your own repository, and that is the point &mdash; and <code>git reset --hard HEAD</code> backs the whole update out.</li>'
                 ),
                 '<p>The first command refreshes the application, its dependencies and the schema; the second rebuilds and restarts the containers. Your database and media live in Docker volumes and are never touched by either step &mdash; <code>docker:up</code> rebuilds images, not data.</p>',
                 '<p>The first command updates the application and its dependencies and stages the new migrations; the second rebuilds the containers <em>and applies those migrations</em>. The self-hosted stack runs its own migration service, so the updater hands the schema step to it rather than applying the same SQL through two different trackers. Your database and media live in Docker volumes and are never touched by either command &mdash; <code>docker:up</code> rebuilds images, not data.</p>'
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
                 replace(
                   replace(
                     content->>'html_content',
                     '<strong>votre modification est conserv&eacute;e</strong>. La mise &agrave; jour fusionne le changement amont dans votre version, et seul un changement qui chevauche r&eacute;ellement le v&ocirc;tre entre en conflit, avec les marqueurs habituels <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; ours</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; theirs</code>. Listez-les avec <code>git diff --name-only --diff-filter=U</code> et r&eacute;solvez avec <code>git checkout --theirs</code> ou <code>--ours</code>.',
                     '<strong>votre modification est conserv&eacute;e</strong>. La mise &agrave; jour fusionne le changement amont dans votre version, et seul un changement qui chevauche r&eacute;ellement le v&ocirc;tre entre en conflit &mdash; la commande liste ces fichiers, et chacun porte les marqueurs habituels <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; your version</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; NextBlock</code>. Modifiez-les comme n''importe quel conflit, ou lancez <code>git checkout -- &lt;fichier&gt;</code> pour abandonner la fusion sur ce seul fichier.'
                   ),
                   '<li><strong>Une fusion en conflit</strong> est annul&eacute;e automatiquement &mdash; votre copie de travail reste intacte, avec les instructions pour r&eacute;soudre &agrave; la main.</li>',
                   '<li><strong>Un conflit</strong> se comporte diff&eacute;remment selon l''installation, volontairement. Sur un fork ou un clone, la fusion amont est <em>annul&eacute;e</em> et votre copie de travail reste intacte. Sur un projet autonome, le conflit est <em>laiss&eacute; en place</em> pour que vous le r&eacute;solviez &mdash; c''est votre d&eacute;p&ocirc;t, et c''est tout l''int&eacute;r&ecirc;t &mdash; et <code>git reset --hard HEAD</code> annule toute la mise &agrave; jour.</li>'
                 ),
                 '<p>La premi&egrave;re commande met &agrave; jour l''application, ses d&eacute;pendances et le sch&eacute;ma ; la seconde reconstruit et red&eacute;marre les conteneurs. Votre base de donn&eacute;es et vos m&eacute;dias vivent dans des volumes Docker et ne sont touch&eacute;s ni par l''une ni par l''autre &mdash; <code>docker:up</code> reconstruit des images, pas des donn&eacute;es.</p>',
                 '<p>La premi&egrave;re commande met &agrave; jour l''application et ses d&eacute;pendances et pr&eacute;pare les nouvelles migrations ; la seconde reconstruit les conteneurs <em>et applique ces migrations</em>. La pile auto-h&eacute;berg&eacute;e dispose de son propre service de migration : la mise &agrave; jour lui confie donc l''&eacute;tape sch&eacute;ma plut&ocirc;t que d''appliquer le m&ecirc;me SQL via deux suivis diff&eacute;rents. Votre base de donn&eacute;es et vos m&eacute;dias vivent dans des volumes Docker et ne sont touch&eacute;s par aucune des deux commandes &mdash; <code>docker:up</code> reconstruit des images, pas des donn&eacute;es.</p>'
               )
             )
           ),
           updated_at = now()
     WHERE post_id = v_fr_post
       AND block_type = 'text';
  END IF;
END
$body$;
