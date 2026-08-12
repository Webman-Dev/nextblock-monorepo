-- 00000000000023_updating_article_layout_not_host.sql
-- Corrects the most misleading claim in the "How Updating NextBlock Works" article
-- (seeded 00000000000020, corrected in 021 and 022): that the automatic GitHub Action is
-- about being deployed on Vercel.
--
-- It is not. The upstream-sync Action merges the NextBlock MONOREPO into the repository,
-- so it only works where the repository IS the monorepo — a Vercel 1-click deploy, a
-- GitHub fork, or a clone. A project scaffolded by `npm create nextblock` is the flattened
-- standalone app (app/, components/, lib/ at the root); merging apps/ + libs/ + nx.json
-- into it would wreck it. Pushing that project to GitHub and deploying it on Vercel does
-- not change its layout, so it is still a `npm run update` install. Docker is orthogonal:
-- it is how you RUN a project, not what shape the repository is.
--
-- Also documents that a merge conflict now holds the migration step back until the
-- conflict is resolved, so the schema never moves ahead of undecided code.
--
-- Targeted, idempotent replace() as in 021/022. Data-only; no schema change.

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
                     -- 1. The section intro: say what actually qualifies.
                     '<p>This path updates itself. When you deployed, NextBlock created a repository you own; the dashboard&rsquo;s <strong>Connect GitHub</strong> onboarding step installs a workflow into it that runs <strong>every day at midnight UTC</strong> and can also be triggered by hand from your repository&rsquo;s <strong>Actions</strong> tab.</p>',
                     '<p>This path updates itself. When you deployed, NextBlock created a repository you own; the dashboard&rsquo;s <strong>Connect GitHub</strong> onboarding step installs a workflow into it that runs <strong>every day at midnight UTC</strong> and can also be triggered by hand from your repository&rsquo;s <strong>Actions</strong> tab.</p>\n<div class=''rounded-3xl border border-slate-200 bg-slate-50 p-6 my-8 dark:border-white/10 dark:bg-white/5''>\n  <p class=''mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300''>What qualifies &mdash; it is the repository, not the host</p>\n  <p class=''mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200''>The workflow merges the <strong>NextBlock monorepo</strong> into your repository, so it only works where your repository <em>is</em> that monorepo: a one-click deploy, a GitHub fork, or a clone. A project created with <code>npm create nextblock</code> is the flattened standalone app &mdash; <code>app/</code>, <code>components/</code> and <code>lib/</code> at the root &mdash; and merging <code>apps/</code>, <code>libs/</code> and <code>nx.json</code> into it would wreck it. Pushing that project to GitHub and deploying it on Vercel does not change its shape: it is still an <code>npm run update</code> install, and NextBlock will not offer it this workflow. Docker is a separate question entirely &mdash; that is how you <em>run</em> a project, not what shape its repository is.</p>\n</div>'
                   ),
                   -- 2. The FAQ answer, which asked exactly the question this clarifies.
                   '<h3>I am on the one-click Vercel deploy &mdash; do I need to run anything?</h3>\n<p>No. That path is fully automatic. The command exists for when you want an update <em>now</em> rather than at midnight, or when you are working on a local clone.</p>',
                   '<h3>I am on the one-click Vercel deploy &mdash; do I need to run anything?</h3>\n<p>No. That path is fully automatic. The command exists for when you want an update <em>now</em> rather than at midnight, or when you are working on a local clone.</p>\n<h3>I deployed to Vercel, but from <code>npm create nextblock</code>. Is that automatic too?</h3>\n<p>No &mdash; and this is the distinction that catches people out. Automatic updates depend on your repository being the NextBlock <strong>monorepo</strong>, not on where the site is hosted. A project scaffolded by the CLI is the flattened standalone app whatever you deploy it to, so it updates with <code>npm run update</code>. You will not see the <strong>Connect GitHub</strong> step on that kind of install, because the workflow it installs would merge a completely different source tree into yours.</p>'
                 ),
                 -- 3. Conflicts hold the schema step.
                 '<li><strong>A failed migration</strong> rolls back. Fix the cause and re-run; nothing half-applied is left behind.</li>',
                 '<li><strong>A failed migration</strong> rolls back. Fix the cause and re-run; nothing half-applied is left behind.</li>\n  <li><strong>Unresolved conflicts hold the database back.</strong> If a merge left conflicts, the update finishes the code and dependency work but <em>stops before migrating</em> &mdash; your schema never moves ahead of code you have not finished deciding on. Resolve them and run <code>npm run update</code> again to apply the migrations, or walk away with <code>git reset --hard HEAD</code>; either way the database was never touched.</li>'
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
                     '<p>Ce chemin se met &agrave; jour tout seul. Lors du d&eacute;ploiement, NextBlock a cr&eacute;&eacute; un d&eacute;p&ocirc;t qui vous appartient ; l''&eacute;tape <strong>Connect GitHub</strong> du tableau de bord y installe un workflow qui s''ex&eacute;cute <strong>chaque jour &agrave; minuit UTC</strong> et peut aussi &ecirc;tre lanc&eacute; &agrave; la demande depuis l''onglet <strong>Actions</strong> de votre d&eacute;p&ocirc;t.</p>',
                     '<p>Ce chemin se met &agrave; jour tout seul. Lors du d&eacute;ploiement, NextBlock a cr&eacute;&eacute; un d&eacute;p&ocirc;t qui vous appartient ; l''&eacute;tape <strong>Connect GitHub</strong> du tableau de bord y installe un workflow qui s''ex&eacute;cute <strong>chaque jour &agrave; minuit UTC</strong> et peut aussi &ecirc;tre lanc&eacute; &agrave; la demande depuis l''onglet <strong>Actions</strong> de votre d&eacute;p&ocirc;t.</p>\n<div class=''rounded-3xl border border-slate-200 bg-slate-50 p-6 my-8 dark:border-white/10 dark:bg-white/5''>\n  <p class=''mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300''>Ce qui compte : le d&eacute;p&ocirc;t, pas l''h&eacute;bergeur</p>\n  <p class=''mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200''>Le workflow fusionne le <strong>monorepo NextBlock</strong> dans votre d&eacute;p&ocirc;t : il ne fonctionne donc que si votre d&eacute;p&ocirc;t <em>est</em> ce monorepo &mdash; d&eacute;ploiement en un clic, fork GitHub ou clone. Un projet cr&eacute;&eacute; avec <code>npm create nextblock</code> est l''application autonome aplatie &mdash; <code>app/</code>, <code>components/</code> et <code>lib/</code> &agrave; la racine &mdash; et y fusionner <code>apps/</code>, <code>libs/</code> et <code>nx.json</code> le casserait. Pousser ce projet sur GitHub et le d&eacute;ployer sur Vercel ne change pas sa forme : il se met toujours &agrave; jour avec <code>npm run update</code>, et NextBlock ne lui proposera pas ce workflow. Docker est une tout autre question &mdash; c''est la fa&ccedil;on d''<em>ex&eacute;cuter</em> un projet, pas la forme de son d&eacute;p&ocirc;t.</p>\n</div>'
                   ),
                   '<h3>Je suis sur le d&eacute;ploiement Vercel en un clic &mdash; dois-je lancer quelque chose ?</h3>\n<p>Non. Ce chemin est enti&egrave;rement automatique. La commande existe pour mettre &agrave; jour <em>tout de suite</em> plut&ocirc;t qu''&agrave; minuit, ou lorsque vous travaillez sur un clone local.</p>',
                   '<h3>Je suis sur le d&eacute;ploiement Vercel en un clic &mdash; dois-je lancer quelque chose ?</h3>\n<p>Non. Ce chemin est enti&egrave;rement automatique. La commande existe pour mettre &agrave; jour <em>tout de suite</em> plut&ocirc;t qu''&agrave; minuit, ou lorsque vous travaillez sur un clone local.</p>\n<h3>J''ai d&eacute;ploy&eacute; sur Vercel, mais depuis <code>npm create nextblock</code>. Est-ce automatique aussi ?</h3>\n<p>Non &mdash; et c''est la distinction qui pi&egrave;ge le plus. Les mises &agrave; jour automatiques d&eacute;pendent du fait que votre d&eacute;p&ocirc;t soit le <strong>monorepo</strong> NextBlock, pas de l''endroit o&ugrave; le site est h&eacute;berg&eacute;. Un projet g&eacute;n&eacute;r&eacute; par le CLI reste l''application autonome aplatie, quel que soit l''h&eacute;bergeur : il se met &agrave; jour avec <code>npm run update</code>. L''&eacute;tape <strong>Connect GitHub</strong> ne s''affiche pas sur ce type d''installation, car le workflow qu''elle installe fusionnerait une arborescence totalement diff&eacute;rente dans la v&ocirc;tre.</p>'
                 ),
                 '<li><strong>Une migration en &eacute;chec</strong> est annul&eacute;e. Corrigez la cause et relancez : rien ne reste &agrave; moiti&eacute; appliqu&eacute;.</li>',
                 '<li><strong>Une migration en &eacute;chec</strong> est annul&eacute;e. Corrigez la cause et relancez : rien ne reste &agrave; moiti&eacute; appliqu&eacute;.</li>\n  <li><strong>Les conflits non r&eacute;solus bloquent la base.</strong> Si une fusion a laiss&eacute; des conflits, la mise &agrave; jour termine le code et les d&eacute;pendances mais <em>s''arr&ecirc;te avant les migrations</em> &mdash; votre sch&eacute;ma ne prend jamais de l''avance sur un code que vous n''avez pas fini d''arbitrer. R&eacute;solvez-les puis relancez <code>npm run update</code> pour appliquer les migrations, ou abandonnez avec <code>git reset --hard HEAD</code> : dans les deux cas la base n''a jamais &eacute;t&eacute; touch&eacute;e.</li>'
               )
             )
           ),
           updated_at = now()
     WHERE post_id = v_fr_post
       AND block_type = 'text';
  END IF;
END
$body$;
