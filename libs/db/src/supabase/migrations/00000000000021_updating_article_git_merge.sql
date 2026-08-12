-- 00000000000021_updating_article_git_merge.sql
-- Corrects the "How Updating NextBlock Works" article seeded in 00000000000020.
--
-- That version described the standalone update as "replace the files and keep a backup
-- under .nextblock-backup/". The updater now performs a real git 3-way merge instead:
-- both template versions are committed into the project's own object database under
-- refs/nextblock/{base,head}, and the diff between them is applied with `git apply --3way`.
-- A developer's edits to framework files are preserved and only genuine overlaps conflict.
-- The copy-and-back-up path survives only as the fallback for a project with no git repo,
-- no commits, or a dirty tree.
--
-- 020 is already applied everywhere and never replays, so the copy is corrected here as
-- targeted, idempotent string replacements rather than a full re-write of the body: each
-- replace() is a no-op once the old sentence is gone, so re-running changes nothing.
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

  ---------------------------------------------------------------------------
  -- English
  ---------------------------------------------------------------------------
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
                     -- 1. the "if something goes wrong" bullet
                     '<li><strong>Standalone projects:</strong> every framework file the update replaces is copied first into a timestamped folder under <code>.nextblock-backup/</code> in your project. Nothing is deleted, so files you added yourself are never removed.</li>',
                     '<li><strong>Standalone projects:</strong> the update is applied as a <strong>git 3-way merge</strong> into your working tree &mdash; nothing is committed for you. Review it with <code>git diff</code>, and undo the whole thing with <code>git reset --hard HEAD</code>. Nothing is ever deleted, so files you added yourself are never removed.</li>'
                   ),
                   -- 2. the "you customised a framework file" paragraph
                   '<p>If you have customised a file that NextBlock owns &mdash; something under <code>app/</code>, <code>components/</code> or <code>lib/</code> &mdash; the update will replace it and back up your version. Diff the backup afterwards to bring your change forward. Customisations that live in your own new files, in the CMS, or in <code>.env</code> are never affected.</p>',
                   '<p>If you have customised a file that NextBlock owns &mdash; something under <code>app/</code>, <code>components/</code> or <code>lib/</code> &mdash; <strong>your edit is kept</strong>. The update merges the upstream change into your version, and only a change that genuinely overlaps yours conflicts, with ordinary <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; ours</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; theirs</code> markers. List them with <code>git diff --name-only --diff-filter=U</code> and resolve with <code>git checkout --theirs</code> or <code>--ours</code>. Customisations in your own files, in the CMS, or in <code>.env</code> are never touched at all.</p>'
                 ),
                 -- 3. the managed-cloud section
                 '<p>Your project is a standalone Next.js app, so new framework code is fetched from the published <code>create-nextblock</code> package on npm &mdash; the exact artifact your project was scaffolded from, versioned in lockstep with the release. NextBlock refreshes the files it owns, merges the new dependency versions into your <code>package.json</code>, runs <code>npm install</code>, and then applies migrations.</p>',
                 '<p>Your project is a standalone Next.js app with no upstream to pull from, so new framework code comes from the published <code>create-nextblock</code> package on npm &mdash; the exact artifact your project was scaffolded from, versioned in lockstep with the release. NextBlock fetches both your current version and the new one, and applies the difference between them as a <strong>git 3-way merge</strong>, so the update behaves exactly like a <code>git pull</code>: files you never touched update silently, files you customised keep your changes. It then merges the new dependency versions into your <code>package.json</code>, runs <code>npm install</code>, and applies migrations.</p><p>This needs a git repository with at least one commit and a clean working tree &mdash; commit your work before updating. Without that there is nothing to merge against, so the files are copied instead and anything replaced is kept under <code>.nextblock-backup/</code>.</p>'
               )
             )
           ),
           updated_at = now()
     WHERE post_id = v_en_post
       AND block_type = 'text';
  END IF;

  ---------------------------------------------------------------------------
  -- French
  ---------------------------------------------------------------------------
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
                     '<li><strong>Projets autonomes :</strong> chaque fichier remplac&eacute; est d''abord copi&eacute; dans un dossier horodat&eacute; sous <code>.nextblock-backup/</code> dans votre projet. Rien n''est supprim&eacute; : les fichiers que vous avez ajout&eacute;s ne disparaissent jamais.</li>',
                     '<li><strong>Projets autonomes :</strong> la mise &agrave; jour est appliqu&eacute;e comme une <strong>fusion git &agrave; trois voies</strong> dans votre copie de travail &mdash; rien n''est valid&eacute; &agrave; votre place. Examinez-la avec <code>git diff</code>, et annulez tout avec <code>git reset --hard HEAD</code>. Rien n''est jamais supprim&eacute; : les fichiers que vous avez ajout&eacute;s ne disparaissent jamais.</li>'
                   ),
                   '<p>Si vous avez personnalis&eacute; un fichier appartenant &agrave; NextBlock &mdash; sous <code>app/</code>, <code>components/</code> ou <code>lib/</code> &mdash; la mise &agrave; jour le remplacera en sauvegardant votre version. Comparez ensuite la sauvegarde pour reporter votre modification. Les personnalisations qui vivent dans vos propres fichiers, dans le CMS ou dans <code>.env</code> ne sont jamais affect&eacute;es.</p>',
                   '<p>Si vous avez personnalis&eacute; un fichier appartenant &agrave; NextBlock &mdash; sous <code>app/</code>, <code>components/</code> ou <code>lib/</code> &mdash; <strong>votre modification est conserv&eacute;e</strong>. La mise &agrave; jour fusionne le changement amont dans votre version, et seul un changement qui chevauche r&eacute;ellement le v&ocirc;tre entre en conflit, avec les marqueurs habituels <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; ours</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; theirs</code>. Listez-les avec <code>git diff --name-only --diff-filter=U</code> et r&eacute;solvez avec <code>git checkout --theirs</code> ou <code>--ours</code>. Les personnalisations dans vos propres fichiers, dans le CMS ou dans <code>.env</code> ne sont jamais touch&eacute;es.</p>'
                 ),
                 '<p>Votre projet est une application Next.js autonome : le nouveau code provient donc du paquet <code>create-nextblock</code> publi&eacute; sur npm &mdash; exactement l''artefact &agrave; partir duquel votre projet a &eacute;t&eacute; g&eacute;n&eacute;r&eacute;, versionn&eacute; en phase avec la release. NextBlock rafra&icirc;chit les fichiers qui lui appartiennent, fusionne les nouvelles versions de d&eacute;pendances dans votre <code>package.json</code>, lance <code>npm install</code>, puis applique les migrations.</p>',
                 '<p>Votre projet est une application Next.js autonome sans d&eacute;p&ocirc;t amont &agrave; tirer : le nouveau code provient donc du paquet <code>create-nextblock</code> publi&eacute; sur npm &mdash; exactement l''artefact &agrave; partir duquel votre projet a &eacute;t&eacute; g&eacute;n&eacute;r&eacute;, versionn&eacute; en phase avec la release. NextBlock r&eacute;cup&egrave;re votre version actuelle et la nouvelle, puis applique la diff&eacute;rence entre les deux comme une <strong>fusion git &agrave; trois voies</strong> : la mise &agrave; jour se comporte donc exactement comme un <code>git pull</code> &mdash; les fichiers que vous n''avez jamais touch&eacute;s se mettent &agrave; jour silencieusement, ceux que vous avez personnalis&eacute;s conservent vos changements. Elle fusionne ensuite les nouvelles versions de d&eacute;pendances dans votre <code>package.json</code>, lance <code>npm install</code> et applique les migrations.</p><p>Cela n&eacute;cessite un d&eacute;p&ocirc;t git avec au moins un commit et une copie de travail propre &mdash; validez votre travail avant de mettre &agrave; jour. Sans cela il n''y a rien contre quoi fusionner : les fichiers sont alors copi&eacute;s et tout ce qui est remplac&eacute; est conserv&eacute; sous <code>.nextblock-backup/</code>.</p>'
               )
             )
           ),
           updated_at = now()
     WHERE post_id = v_fr_post
       AND block_type = 'text';
  END IF;
END
$body$;
