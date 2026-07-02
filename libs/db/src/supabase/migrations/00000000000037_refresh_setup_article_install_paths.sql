-- Rewrite the seeded "How to Setup NextBlock" tutorial (EN + FR) around the four
-- current installation paths:
--   1. One-click Deploy on Vercel (Supabase Marketplace integration, zero env vars),
--   2. npm create nextblock (standalone app, browser /setup wizard on :3000),
--   3. git clone -> npm install -> npx nx serve nextblock (browser /setup wizard on :4200),
--   4. git clone -> npm install -> npm run docker:setup (fully local, non-interactive).
--
-- Also sets the posts' meta_title / meta_description (previously unset — SEO title fell
-- back to posts.title and the description to posts.subtitle) and refreshes
-- title / subtitle / excerpt for both languages. Slugs are intentionally unchanged:
-- 'how-to-setup-nextblock' and 'comment-configurer-nextblock' are public URLs and are
-- also mapped to the tutorial presentation (post-article--tutorial) by slug.
--
-- Forward-only and idempotent: it updates the two posts rows and replaces their single
-- text block (same pattern as 00000000000029). Safe to re-run; a no-op if the posts
-- do not exist.

-- EN post metadata
UPDATE public.posts
SET
  title = 'How to Install NextBlock: Every Setup Option Explained',
  subtitle = 'Four ways to launch NextBlock: a one-click Vercel deploy, npm create nextblock, git clone with the browser setup wizard, or a fully local Docker stack.',
  excerpt = 'Every way to install NextBlock — one-click cloud deploy, CLI scaffold, git clone, or self-hosted Docker — with copy-paste steps for each.',
  meta_title = 'How to Install NextBlock — Vercel, CLI, Git or Docker',
  meta_description = 'Install NextBlock in minutes — one-click Vercel deploy, npm create nextblock, git clone, or self-hosted Docker. No config files, no manual SQL.'
WHERE slug = 'how-to-setup-nextblock';

-- FR post metadata
UPDATE public.posts
SET
  title = $meta$Installer NextBlock : toutes les options expliquées$meta$,
  subtitle = $meta$Quatre façons de lancer NextBlock : déploiement Vercel en un clic, npm create nextblock, git clone avec l'assistant navigateur, ou une pile Docker 100 % locale.$meta$,
  excerpt = $meta$Toutes les façons d'installer NextBlock — cloud en un clic, CLI, git clone ou Docker auto-hébergé — avec les étapes à copier-coller.$meta$,
  meta_title = $meta$Installer NextBlock — Vercel, CLI, Git ou Docker$meta$,
  meta_description = $meta$Installez NextBlock en quelques minutes : déploiement Vercel en un clic, npm create nextblock, git clone ou Docker auto-hébergé. Sans fichiers de config ni SQL.$meta$
WHERE slug = 'comment-configurer-nextblock';

WITH target_posts AS (
  SELECT id, language_id, slug
  FROM public.posts
  WHERE slug IN ('how-to-setup-nextblock', 'comment-configurer-nextblock')
),
purged AS (
  DELETE FROM public.blocks
  WHERE post_id IN (SELECT id FROM target_posts)
)
INSERT INTO public.blocks (post_id, language_id, block_type, content, "order")

-- EN: How to Install NextBlock
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>NextBlock is an open-source, AI-native CMS built on Next.js and Supabase — and installing it no longer involves config files, terminal wizards, or manual SQL. There are four ways to get running, and they all end in the same place: a browser <strong>setup wizard</strong> that connects your database, configures media storage, and creates your admin account for you. Pick the path that fits, follow the steps, and you will be publishing in minutes.</p>

<div class='grid gap-5 md:grid-cols-2 my-10'>
  <a href='#one-click-vercel' class='block rounded-[1.75rem] border border-blue-200 bg-blue-50/70 p-6 no-underline transition-shadow hover:shadow-lg dark:border-blue-500/20 dark:bg-blue-500/10'>
    <p class='mt-0 mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200'>Fastest &middot; about 3 minutes</p>
    <h3 class='mt-3 mb-2 text-xl font-semibold text-slate-900 dark:text-white'>One-click deploy on Vercel</h3>
    <p class='mb-0 text-sm leading-6 text-slate-600 dark:text-slate-300'>A live production site with a managed database. No terminal, no environment variables, nothing to copy.</p>
  </a>
  <a href='#npm-create' class='block rounded-[1.75rem] border border-violet-200 bg-violet-50/70 p-6 no-underline transition-shadow hover:shadow-lg dark:border-violet-500/20 dark:bg-violet-500/10'>
    <p class='mt-0 mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200'>Recommended for new projects</p>
    <h3 class='mt-3 mb-2 text-xl font-semibold text-slate-900 dark:text-white'>npm create nextblock</h3>
    <p class='mb-0 text-sm leading-6 text-slate-600 dark:text-slate-300'>Scaffold a standalone Next.js app with NextBlock built in, then finish setup in your browser.</p>
  </a>
  <a href='#git-clone' class='block rounded-[1.75rem] border border-emerald-200 bg-emerald-50/70 p-6 no-underline transition-shadow hover:shadow-lg dark:border-emerald-500/20 dark:bg-emerald-500/10'>
    <p class='mt-0 mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Full source code</p>
    <h3 class='mt-3 mb-2 text-xl font-semibold text-slate-900 dark:text-white'>Clone the repository</h3>
    <p class='mb-0 text-sm leading-6 text-slate-600 dark:text-slate-300'>Run the complete monorepo — the CMS, every package, and the docs. Made for contributors and platform teams.</p>
  </a>
  <a href='#docker' class='block rounded-[1.75rem] border border-amber-200 bg-amber-50/70 p-6 no-underline transition-shadow hover:shadow-lg dark:border-amber-500/20 dark:bg-amber-500/10'>
    <p class='mt-0 mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>100% local &middot; no accounts</p>
    <h3 class='mt-3 mb-2 text-xl font-semibold text-slate-900 dark:text-white'>Self-hosted with Docker</h3>
    <p class='mb-0 text-sm leading-6 text-slate-600 dark:text-slate-300'>One command boots the entire stack on your machine — database, auth, storage, and the CMS. No cloud services at all.</p>
  </a>
</div>

<p class='text-sm text-slate-500 dark:text-slate-400'>Not sure which to pick? If you want a live website with the least effort, choose <a href='#one-click-vercel'>Vercel</a>. If you want a local project to build on, choose <a href='#npm-create'>npm create nextblock</a>.</p>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/included.webp' alt='NextBlock CMS platform overview showing the block editor, CMS dashboard, and integrations included with every installation' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Whichever path you choose, you get the same block editor, the same CMS, and the same database schema.</figcaption>
</figure>

<h2 id='one-click-vercel'>Option 1: One-Click Deploy on Vercel</h2>
<p>The fastest way to get a production NextBlock site. One button creates your own copy of NextBlock on GitHub, provisions a managed Supabase database, and deploys the site — you never open a terminal or copy a single key.</p>
<ol class='space-y-2'>
  <li><strong>Click Deploy to Vercel</strong> and sign in — Vercel clones NextBlock into a new repository you own.</li>
  <li><strong>Create the Supabase database</strong> when prompted: pick a name and a region. Vercel connects it to the project and injects the keys before the first build.</li>
  <li><strong>Open your new site</strong> once the build finishes. Every fresh instance takes you straight to the setup wizard.</li>
  <li><strong>Create your administrator account.</strong> It is confirmed instantly — no verification email — and you land in the CMS dashboard.</li>
</ol>
<div class='my-8'>
  <a href='https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&amp;project-name=nextblock&amp;repository-name=nextblock&amp;stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D' target='_blank' rel='noopener' class='inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white no-underline shadow-lg hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'>Deploy to Vercel &rarr;</a>
</div>
<div class='rounded-3xl border border-blue-200 bg-blue-50/80 p-6 my-8 dark:border-blue-500/20 dark:bg-blue-500/10'>
  <p class='mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200'>Zero configuration</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>There are no environment variables to fill in. Media storage automatically uses your connected Supabase project, security secrets are derived for you, and database migrations run automatically on every production build. Adding a custom domain later? Set <code>NEXT_PUBLIC_URL</code> in your Vercel project and redeploy.</p>
</div>
<p>Your site also keeps itself current: the dashboard checklist includes a one-click <strong>Connect GitHub</strong> step that installs a daily workflow syncing your copy with the latest NextBlock release.</p>

<h2 id='npm-create'>Option 2: Scaffold a Project with npm create nextblock</h2>
<p>The best starting point for building your own site. The CLI scaffolds a standalone Next.js application with NextBlock already wired in — no monorepo, no workspace tooling — and hands everything else to the browser wizard.</p>
<p>Before you start, create a free project at <a href='https://supabase.com' target='_blank' rel='noopener'>supabase.com</a> (or pick the CLI's Docker mode during creation and skip cloud accounts entirely).</p>
<pre><code>npm create nextblock@latest my-site
cd my-site
npm run dev</code></pre>
<p>Open <code>http://localhost:3000/setup</code> and let the wizard take over:</p>
<ol class='space-y-2'>
  <li><strong>Connect Supabase</strong> — paste your project URL, publishable (anon) key, secret (service role) key, and a personal access token so the wizard can apply the database schema for you.</li>
  <li><strong>Choose media storage</strong> — plug in a Cloudflare R2 bucket for images and files.</li>
  <li><strong>Create your administrator</strong> — the wizard applies every migration, generates the app secrets, writes <code>.env.local</code>, creates your confirmed admin account, and signs you in.</li>
</ol>
<div class='rounded-3xl border border-violet-200 bg-violet-50/80 p-6 my-8 dark:border-violet-500/20 dark:bg-violet-500/10'>
  <p class='mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200'>Premium modules</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>Need a store? One command adds products, checkout, orders, and coupons — license-gated and ready when you are: <code>npx create-nextblock activate ecommerce</code></p>
</div>

<h2 id='git-clone'>Option 3: Clone the Repository</h2>
<p>Run the full Nx monorepo: the CMS application, every shared package, the CLI source, and the documentation. This is the path for contributors, plugin authors, and teams that customize the platform itself.</p>
<pre><code>git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npx nx serve nextblock</code></pre>
<p>Open <code>http://localhost:4200</code> — a fresh install redirects every page to <code>/setup</code>, where the same three-step wizard connects Supabase, configures storage, and creates your admin. It validates your keys, writes <code>.env.local</code> with generated secrets, and applies all migrations over the Supabase Management API — no Supabase CLI required.</p>
<div class='rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 my-8 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
  <p class='mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>No terminal setup</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>Configuration moved entirely to the browser — there is no interactive terminal step anymore. When the wizard finishes you are signed in as the administrator; restart the dev server once afterwards so the fresh environment is baked into the app bundle.</p>
</div>

<h2 id='docker'>Option 4: Self-Hosted with Docker</h2>
<p>Everything runs on your machine: Supabase's Postgres and auth engines, a PostgREST API behind a Kong gateway, S3-compatible MinIO storage, and the CMS itself. No Supabase account, no Vercel, no email service — ideal for evaluations, air-gapped environments, and full data ownership.</p>
<p>With <a href='https://www.docker.com/products/docker-desktop/' target='_blank' rel='noopener'>Docker Desktop</a> installed and running:</p>
<pre><code>git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run docker:setup</code></pre>
<p>The command asks nothing: it generates secure keys, builds the stack, applies every migration, and starts the services. When it finishes, open <code>http://localhost:3000</code> — the setup wizard already has the database and MinIO storage wired up, so the only step left is creating your administrator (confirmed instantly, no email required).</p>
<div class='rounded-3xl border border-amber-200 bg-amber-50/80 p-6 my-8 dark:border-amber-500/20 dark:bg-amber-500/10'>
  <p class='mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>Day-2 commands</p>
  <pre class='mt-4 mb-0'><code># rebuild and restart the stack
npm run docker:up

# stop the stack (your data persists in Docker volumes)
npm run docker:down

# follow the application logs
npm run docker:logs</code></pre>
</div>

<h2 id='after-install'>After You Install: Your First 10 Minutes</h2>
<p>Every path drops you at <code>/cms/dashboard</code>, signed in as the first administrator. A built-in onboarding checklist walks you through the rest:</p>
<ul class='space-y-2'>
  <li><strong>Add your branding</strong> — upload your logo and set the site title.</li>
  <li><strong>Set your footer</strong> — copyright line and footer navigation.</li>
  <li><strong>Configure email (SMTP)</strong> — under Settings, so password resets and invitations can send.</li>
  <li><strong>Optional extras</strong> — connect analytics, enable bot protection, and (on Vercel) turn on automatic updates.</li>
</ul>
<p>From there, see how the platform fits together in <a href='/article/how-nextblock-works'>How NextBlock Works</a>, add a storefront with the <a href='/article/nextblock-commerce-guide'>Commerce guide</a>, or meet your AI copilot in the <a href='/article/nextblock-cortex-ai-guide'>Cortex AI guide</a>.</p>

<h2 id='faq'>Installation FAQ</h2>
<h3>Is NextBlock free?</h3>
<p>Yes — the core CMS is 100% free and open source (AGPL). Premium packages such as e-commerce and Cortex AI are optional and activate with a license key.</p>
<h3>Do I need a Supabase account?</h3>
<p>On Vercel, the database is created for you during the deploy. For <code>npm create nextblock</code> and the cloned repository you bring a free Supabase project. With Docker you need no cloud accounts at all.</p>
<h3>Do I have to run migrations or SQL by hand?</h3>
<p>No. The setup wizard, the Vercel build, and the Docker stack all apply the database schema automatically — and re-running is always safe.</p>
<h3>Can I switch paths later?</h3>
<p>Yes. Every path runs the same application and the same database schema, so you can prototype locally with Docker today and deploy to Vercel tomorrow. NextBlock deploys like any standard Next.js app.</p>
<h3>How do I update NextBlock?</h3>
<p>On Vercel, the Connect GitHub onboarding step enables a daily automatic sync with upstream. On a cloned repository, <code>git pull</code> and restart — pending database migrations apply automatically on production builds. With Docker, pull the latest code and run <code>npm run docker:up</code>.</p>

<div class='rounded-[2rem] border border-slate-200/80 bg-slate-50 p-8 my-12 text-center dark:border-white/10 dark:bg-white/5'>
  <p class='mt-0 text-2xl font-semibold text-slate-900 dark:text-white'>Ready to launch?</p>
  <p class='text-sm text-slate-600 dark:text-slate-300'>Pick your path above, or jump straight to the fastest one.</p>
  <div class='mt-5 flex flex-wrap justify-center gap-3'>
    <a href='https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&amp;project-name=nextblock&amp;repository-name=nextblock&amp;stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D' target='_blank' rel='noopener' class='inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white no-underline shadow-lg hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'>Deploy on Vercel</a>
    <a href='https://github.com/nextblock-cms/nextblock' target='_blank' rel='noopener' class='inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 no-underline hover:border-slate-500 dark:border-white/20 dark:text-slate-200 dark:hover:border-white/50'>View on GitHub</a>
  </div>
</div>$$
), 0 FROM target_posts tp WHERE tp.slug = 'how-to-setup-nextblock'

UNION ALL

-- FR: Installer NextBlock
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>NextBlock est un CMS open source et natif IA, construit sur Next.js et Supabase — et son installation ne passe plus par des fichiers de configuration, des assistants en ligne de commande ou du SQL manuel. Il existe quatre façons de démarrer, et elles aboutissent toutes au même endroit : un <strong>assistant de configuration</strong> dans le navigateur qui connecte votre base de données, configure le stockage des médias et crée votre compte administrateur. Choisissez le chemin qui vous convient, suivez les étapes, et vous publierez en quelques minutes.</p>

<div class='grid gap-5 md:grid-cols-2 my-10'>
  <a href='#one-click-vercel' class='block rounded-[1.75rem] border border-blue-200 bg-blue-50/70 p-6 no-underline transition-shadow hover:shadow-lg dark:border-blue-500/20 dark:bg-blue-500/10'>
    <p class='mt-0 mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200'>Le plus rapide &middot; environ 3 minutes</p>
    <h3 class='mt-3 mb-2 text-xl font-semibold text-slate-900 dark:text-white'>Déploiement Vercel en un clic</h3>
    <p class='mb-0 text-sm leading-6 text-slate-600 dark:text-slate-300'>Un site de production en ligne avec une base de données managée. Pas de terminal, pas de variables d'environnement, rien à copier.</p>
  </a>
  <a href='#npm-create' class='block rounded-[1.75rem] border border-violet-200 bg-violet-50/70 p-6 no-underline transition-shadow hover:shadow-lg dark:border-violet-500/20 dark:bg-violet-500/10'>
    <p class='mt-0 mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200'>Recommandé pour vos projets</p>
    <h3 class='mt-3 mb-2 text-xl font-semibold text-slate-900 dark:text-white'>npm create nextblock</h3>
    <p class='mb-0 text-sm leading-6 text-slate-600 dark:text-slate-300'>Générez une app Next.js autonome avec NextBlock intégré, puis terminez la configuration dans votre navigateur.</p>
  </a>
  <a href='#git-clone' class='block rounded-[1.75rem] border border-emerald-200 bg-emerald-50/70 p-6 no-underline transition-shadow hover:shadow-lg dark:border-emerald-500/20 dark:bg-emerald-500/10'>
    <p class='mt-0 mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Code source complet</p>
    <h3 class='mt-3 mb-2 text-xl font-semibold text-slate-900 dark:text-white'>Cloner le dépôt</h3>
    <p class='mb-0 text-sm leading-6 text-slate-600 dark:text-slate-300'>Faites tourner le monorepo complet — le CMS, tous les packages et la documentation. Conçu pour les contributeurs et les équipes plateforme.</p>
  </a>
  <a href='#docker' class='block rounded-[1.75rem] border border-amber-200 bg-amber-50/70 p-6 no-underline transition-shadow hover:shadow-lg dark:border-amber-500/20 dark:bg-amber-500/10'>
    <p class='mt-0 mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>100 % local &middot; aucun compte</p>
    <h3 class='mt-3 mb-2 text-xl font-semibold text-slate-900 dark:text-white'>Auto-hébergé avec Docker</h3>
    <p class='mb-0 text-sm leading-6 text-slate-600 dark:text-slate-300'>Une seule commande démarre toute la pile sur votre machine — base de données, auth, stockage et le CMS. Aucun service cloud.</p>
  </a>
</div>

<p class='text-sm text-slate-500 dark:text-slate-400'>Vous hésitez ? Pour un site en ligne avec le minimum d'effort, choisissez <a href='#one-click-vercel'>Vercel</a>. Pour un projet local à personnaliser, choisissez <a href='#npm-create'>npm create nextblock</a>.</p>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/included.webp' alt='Aperçu de la plateforme NextBlock : éditeur de blocs, tableau de bord CMS et intégrations incluses dans chaque installation' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Quel que soit le chemin choisi, vous obtenez le même éditeur de blocs, le même CMS et le même schéma de base de données.</figcaption>
</figure>

<h2 id='one-click-vercel'>Option 1 : Déploiement Vercel en un clic</h2>
<p>Le moyen le plus rapide d'obtenir un site NextBlock en production. Un seul bouton crée votre propre copie de NextBlock sur GitHub, provisionne une base de données Supabase managée et déploie le site — sans jamais ouvrir un terminal ni copier la moindre clé.</p>
<ol class='space-y-2'>
  <li><strong>Cliquez sur Deploy to Vercel</strong> et connectez-vous — Vercel clone NextBlock dans un nouveau dépôt qui vous appartient.</li>
  <li><strong>Créez la base de données Supabase</strong> quand on vous le demande : choisissez un nom et une région. Vercel la connecte au projet et injecte les clés avant le premier build.</li>
  <li><strong>Ouvrez votre nouveau site</strong> une fois le build terminé. Toute nouvelle instance vous amène directement à l'assistant de configuration.</li>
  <li><strong>Créez votre compte administrateur.</strong> Il est confirmé instantanément — aucun email de vérification — et vous arrivez dans le tableau de bord du CMS.</li>
</ol>
<div class='my-8'>
  <a href='https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&amp;project-name=nextblock&amp;repository-name=nextblock&amp;stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D' target='_blank' rel='noopener' class='inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white no-underline shadow-lg hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'>Déployer sur Vercel &rarr;</a>
</div>
<div class='rounded-3xl border border-blue-200 bg-blue-50/80 p-6 my-8 dark:border-blue-500/20 dark:bg-blue-500/10'>
  <p class='mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200'>Zéro configuration</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>Aucune variable d'environnement à remplir. Le stockage des médias utilise automatiquement votre projet Supabase connecté, les secrets de sécurité sont dérivés pour vous, et les migrations de base de données s'exécutent automatiquement à chaque build de production. Un domaine personnalisé plus tard ? Définissez <code>NEXT_PUBLIC_URL</code> dans votre projet Vercel et redéployez.</p>
</div>
<p>Votre site reste aussi à jour tout seul : la checklist du tableau de bord inclut une étape <strong>Connect GitHub</strong> en un clic qui installe un workflow quotidien synchronisant votre copie avec la dernière version de NextBlock.</p>

<h2 id='npm-create'>Option 2 : Créer un projet avec npm create nextblock</h2>
<p>Le meilleur point de départ pour construire votre propre site. Le CLI génère une application Next.js autonome avec NextBlock déjà intégré — sans monorepo ni outillage de workspace — et confie tout le reste à l'assistant du navigateur.</p>
<p>Avant de commencer, créez un projet gratuit sur <a href='https://supabase.com' target='_blank' rel='noopener'>supabase.com</a> (ou choisissez le mode Docker du CLI pendant la création et passez-vous entièrement de comptes cloud).</p>
<pre><code>npm create nextblock@latest mon-site
cd mon-site
npm run dev</code></pre>
<p>Ouvrez <code>http://localhost:3000/setup</code> et laissez l'assistant faire le travail :</p>
<ol class='space-y-2'>
  <li><strong>Connectez Supabase</strong> — collez l'URL du projet, la clé publiable (anon), la clé secrète (service role) et un jeton d'accès personnel pour que l'assistant applique le schéma de base de données à votre place.</li>
  <li><strong>Choisissez le stockage des médias</strong> — branchez un bucket Cloudflare R2 pour les images et les fichiers.</li>
  <li><strong>Créez votre administrateur</strong> — l'assistant applique toutes les migrations, génère les secrets de l'application, écrit <code>.env.local</code>, crée votre compte admin confirmé et vous connecte.</li>
</ol>
<div class='rounded-3xl border border-violet-200 bg-violet-50/80 p-6 my-8 dark:border-violet-500/20 dark:bg-violet-500/10'>
  <p class='mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200'>Modules premium</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>Besoin d'une boutique ? Une seule commande ajoute produits, paiement, commandes et coupons — sous licence, prêts quand vous l'êtes : <code>npx create-nextblock activate ecommerce</code></p>
</div>

<h2 id='git-clone'>Option 3 : Cloner le dépôt</h2>
<p>Faites tourner le monorepo Nx complet : l'application CMS, tous les packages partagés, le code du CLI et la documentation. C'est le chemin des contributeurs, des auteurs de plugins et des équipes qui personnalisent la plateforme elle-même.</p>
<pre><code>git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npx nx serve nextblock</code></pre>
<p>Ouvrez <code>http://localhost:4200</code> — une installation neuve redirige chaque page vers <code>/setup</code>, où le même assistant en trois étapes connecte Supabase, configure le stockage et crée votre admin. Il valide vos clés, écrit <code>.env.local</code> avec des secrets générés, et applique toutes les migrations via l'API de management Supabase — sans CLI Supabase.</p>
<div class='rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 my-8 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
  <p class='mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Plus de configuration terminal</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>La configuration se fait entièrement dans le navigateur — il n'y a plus d'étape interactive en ligne de commande. Quand l'assistant termine, vous êtes connecté en administrateur ; redémarrez ensuite le serveur de développement une fois pour que le nouvel environnement soit intégré au bundle de l'application.</p>
</div>

<h2 id='docker'>Option 4 : Auto-hébergé avec Docker</h2>
<p>Tout tourne sur votre machine : les moteurs Postgres et auth de Supabase, une API PostgREST derrière une passerelle Kong, un stockage MinIO compatible S3 et le CMS lui-même. Pas de compte Supabase, pas de Vercel, pas de service d'email — idéal pour les évaluations, les environnements isolés et la pleine propriété de vos données.</p>
<p>Avec <a href='https://www.docker.com/products/docker-desktop/' target='_blank' rel='noopener'>Docker Desktop</a> installé et démarré :</p>
<pre><code>git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run docker:setup</code></pre>
<p>La commande ne pose aucune question : elle génère des clés sécurisées, construit la pile, applique toutes les migrations et démarre les services. Quand elle se termine, ouvrez <code>http://localhost:3000</code> — l'assistant de configuration a déjà la base de données et le stockage MinIO câblés, il ne reste qu'à créer votre administrateur (confirmé instantanément, sans email).</p>
<div class='rounded-3xl border border-amber-200 bg-amber-50/80 p-6 my-8 dark:border-amber-500/20 dark:bg-amber-500/10'>
  <p class='mt-0 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>Commandes du quotidien</p>
  <pre class='mt-4 mb-0'><code># reconstruire et redémarrer la pile
npm run docker:up

# arrêter la pile (vos données persistent dans les volumes Docker)
npm run docker:down

# suivre les logs de l'application
npm run docker:logs</code></pre>
</div>

<h2 id='after-install'>Après l'installation : vos 10 premières minutes</h2>
<p>Chaque chemin vous dépose sur <code>/cms/dashboard</code>, connecté en tant que premier administrateur. Une checklist d'intégration intégrée vous guide pour la suite :</p>
<ul class='space-y-2'>
  <li><strong>Ajoutez votre identité visuelle</strong> — téléversez votre logo et définissez le titre du site.</li>
  <li><strong>Réglez votre pied de page</strong> — ligne de copyright et navigation du footer.</li>
  <li><strong>Configurez l'email (SMTP)</strong> — dans les réglages, pour que les réinitialisations de mot de passe et les invitations partent bien.</li>
  <li><strong>Extras optionnels</strong> — connectez l'analytics, activez la protection anti-bots et (sur Vercel) les mises à jour automatiques.</li>
</ul>
<p>Ensuite, découvrez comment la plateforme s'articule dans <a href='/article/comment-nextblock-fonctionne'>Comment NextBlock fonctionne</a>, ou ajoutez une boutique avec le <a href='/article/guide-commerce-nextblock'>guide Commerce</a>.</p>

<h2 id='faq'>FAQ d'installation</h2>
<h3>NextBlock est-il gratuit ?</h3>
<p>Oui — le cœur du CMS est 100 % gratuit et open source (AGPL). Les packages premium comme l'e-commerce et Cortex AI sont optionnels et s'activent avec une clé de licence.</p>
<h3>Ai-je besoin d'un compte Supabase ?</h3>
<p>Sur Vercel, la base de données est créée pour vous pendant le déploiement. Pour <code>npm create nextblock</code> et le dépôt cloné, vous apportez un projet Supabase gratuit. Avec Docker, aucun compte cloud n'est nécessaire.</p>
<h3>Dois-je exécuter des migrations ou du SQL à la main ?</h3>
<p>Non. L'assistant de configuration, le build Vercel et la pile Docker appliquent tous le schéma de base de données automatiquement — et le relancer est toujours sans risque.</p>
<h3>Puis-je changer de chemin plus tard ?</h3>
<p>Oui. Chaque chemin exécute la même application et le même schéma de base de données : vous pouvez prototyper en local avec Docker aujourd'hui et déployer sur Vercel demain. NextBlock se déploie comme n'importe quelle app Next.js.</p>
<h3>Comment mettre à jour NextBlock ?</h3>
<p>Sur Vercel, l'étape Connect GitHub de la checklist active une synchronisation quotidienne automatique. Sur un dépôt cloné, <code>git pull</code> puis redémarrez — les migrations en attente s'appliquent automatiquement lors des builds de production. Avec Docker, récupérez le dernier code et lancez <code>npm run docker:up</code>.</p>

<div class='rounded-[2rem] border border-slate-200/80 bg-slate-50 p-8 my-12 text-center dark:border-white/10 dark:bg-white/5'>
  <p class='mt-0 text-2xl font-semibold text-slate-900 dark:text-white'>Prêt à vous lancer ?</p>
  <p class='text-sm text-slate-600 dark:text-slate-300'>Choisissez votre chemin ci-dessus, ou passez directement au plus rapide.</p>
  <div class='mt-5 flex flex-wrap justify-center gap-3'>
    <a href='https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&amp;project-name=nextblock&amp;repository-name=nextblock&amp;stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D' target='_blank' rel='noopener' class='inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white no-underline shadow-lg hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'>Déployer sur Vercel</a>
    <a href='https://github.com/nextblock-cms/nextblock' target='_blank' rel='noopener' class='inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 no-underline hover:border-slate-500 dark:border-white/20 dark:text-slate-200 dark:hover:border-white/50'>Voir sur GitHub</a>
  </div>
</div>$$
), 0 FROM target_posts tp WHERE tp.slug = 'comment-configurer-nextblock';
