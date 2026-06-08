-- Refresh the seeded "How to Setup NextBlock" tutorial (EN + FR) so it matches the
-- current installer flow:
--   * `npm run setup` now requires Supabase + Cloudflare R2 + SMTP up front,
--   * `npx nx serve nextblock` serves on http://localhost:4200, and
--   * the first account to sign up automatically becomes the admin (email confirmation on).
--
-- Forward-only and idempotent: it replaces the single text block of the two setup-article
-- posts seeded in 00000000000010_seed_content_scaffold.sql. Safe to re-run; a no-op if the
-- posts do not exist.

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

-- EN: How to Setup NextBlock
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>There are two strong ways to start with NextBlock: clone the full monorepo if you want the whole platform, or scaffold a standalone app if you want to ship quickly. Both paths land you on the same editorial model, design system, and CMS foundation.</p>

<div class='rounded-[2rem] border border-blue-200 bg-blue-50/80 p-6 my-10 dark:border-blue-500/20 dark:bg-blue-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200'>Choose your path</p>
  <div class='grid gap-6 md:grid-cols-2 mt-5'>
    <div class='rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-500/10 dark:bg-slate-900/40'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>Monorepo</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Best for contributors, plugin authors, and teams that want direct access to every app and shared package.</p>
    </div>
    <div class='rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-500/10 dark:bg-slate-900/40'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>CLI starter</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Best for launching a production-ready Next.js project with NextBlock&trade; already wired in and easy to deploy.</p>
    </div>
  </div>
</div>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/included.webp' alt='NextBlock&trade; platform artwork showing the CMS, blocks, and integrations that ship together' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Whichever path you choose, you still inherit the same block editor, CMS shell, and shared product language.</figcaption>
</figure>

<div class='rounded-[2rem] border border-amber-200 bg-amber-50/80 p-6 my-10 dark:border-amber-500/20 dark:bg-amber-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>Before you start</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>The setup wizard asks for credentials from three services, so create them first:</p>
  <ul class='mt-4 list-disc pl-6 space-y-2 text-sm text-slate-700 dark:text-slate-200'>
    <li><strong>Supabase project</strong> &ndash; Reference ID (Project Settings &gt; General), connection string (Connect &gt; Direct connection &gt; URI), the anon and service_role keys, and a Personal Access Token (Account &gt; Access Tokens).</li>
    <li><strong>Cloudflare R2 bucket</strong> &ndash; create a bucket, enable its Public Development URL, and create an Account API token with Object Read &amp; Write. Copy the Access Key ID and Secret Access Key (shown only once).</li>
    <li><strong>SMTP credentials</strong> &ndash; SMTP2GO works very well; required so Supabase can email the confirmation link your first admin needs to sign in.</li>
  </ul>
</div>

<h2>Path 1: Clone the Monorepo</h2>
<p>This route is ideal when you want the full Nx workspace and every internal package available locally.</p>

<div class='grid gap-6 md:grid-cols-2 my-8'>
  <div class='rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>You get</p>
    <ul class='mt-4 list-disc pl-5 space-y-2 text-sm'>
      <li>The public site, CMS app, CLI source, and shared libraries</li>
      <li>Direct access to <code>libs/</code> for custom block and package work</li>
      <li>Workspace tools like <code>nx graph</code> for dependency visibility</li>
    </ul>
  </div>
  <div class='rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>Good fit for</p>
    <ul class='mt-4 list-disc pl-5 space-y-2 text-sm'>
      <li>Core contributors and maintainers</li>
      <li>Teams building custom modules or premium extensions</li>
      <li>Agencies that want end-to-end control over the platform</li>
    </ul>
  </div>
</div>

<pre><code>git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run setup</code></pre>

<p>The <code>npm run setup</code> wizard creates <code>.env.local</code>, collects your Supabase, Cloudflare R2, and SMTP details, generates local secrets (<code>CRON_SECRET</code>, <code>DRAFT_MODE_SECRET</code>, <code>REVALIDATE_SECRET_TOKEN</code>), links the Supabase CLI, and applies the full schema to your database with <code>npm run db:migrate:fresh</code>.</p>

<p>Then start the app:</p>
<pre><code>npx nx serve nextblock</code></pre>

<div class='rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 my-8 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>First login</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>The dev server runs at <code>http://localhost:4200</code>. Open <code>/sign-up</code> and create your account &ndash; the first account to register automatically becomes the admin. Confirm your email (or confirm the user in Supabase &gt; Authentication &gt; Users), then sign in to reach the CMS at <code>/cms/dashboard</code>.</p>
</div>

<p>Useful monorepo commands:</p>
<pre><code># Build every workspace package
npm run all-builds

# Lint the main application
npm run nx:lint:nextblock

# Regenerate database types
npm run db:types

# Inspect workspace relationships
npx nx graph</code></pre>

<h2>Path 2: Use the CLI Starter</h2>
<p>If your goal is to launch quickly, the CLI gives you a standalone Next.js app with NextBlock&trade; already embedded.</p>

<pre><code>npm create nextblock@latest my-site
cd my-site</code></pre>

<p>The CLI copies a production-ready template, rewrites workspace imports to published packages, and can run the same setup flow for you. Your result is a normal Next.js app with no Nx requirement, so <code>npm run dev</code> serves it on <code>http://localhost:3000</code>.</p>

<p>Configure your environment in <code>.env.local</code>:</p>
<pre><code>NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_URL=http://localhost:3000</code></pre>

<p>Push the schema and start developing:</p>
<pre><code>npm run db:push
npm run dev</code></pre>

<div class='rounded-3xl border border-amber-200 bg-amber-50/80 p-6 my-8 dark:border-amber-500/20 dark:bg-amber-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>Tip</p>
  <p class='mb-0 text-sm text-slate-700 dark:text-slate-200'>The CLI path is the fastest way to evaluate NextBlock&trade; with your own content model before you decide whether you need the full workspace.</p>
</div>

<h2>Activating Premium Modules</h2>
<p>For CLI-generated projects, the commerce package can be activated with a single command:</p>
<pre><code>npx create-nextblock activate ecommerce</code></pre>
<p>This injects wrappers for <code>/cms/orders</code>, <code>/cms/products</code>, <code>/checkout</code>, and the checkout API, all gated through <code>verifyPackageOnline()</code> so premium routes stay aligned with your license.</p>

<h2>Deployment</h2>
<p>NextBlock&trade; deploys like a standard Next.js app. Push to Vercel, Netlify, or any Node.js host, then make sure your server-side environment variables such as the Supabase service role, R2 credentials, SMTP, and <code>CRON_SECRET</code> are configured in that environment, and set <code>NEXT_PUBLIC_URL</code> to your production domain.</p>$$
), 0 FROM target_posts tp WHERE tp.slug = 'how-to-setup-nextblock'

UNION ALL

-- FR: Comment configurer NextBlock
SELECT tp.id, tp.language_id, 'text', jsonb_build_object('html_content',
$$<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>Il existe deux bonnes facons de lancer NextBlock&trade; : cloner le monorepo complet si vous voulez toute la plateforme, ou partir du CLI si vous voulez aller vite. Dans les deux cas, vous retrouvez le meme modele editorial, le meme shell CMS et la meme base produit.</p>

<div class='rounded-[2rem] border border-blue-200 bg-blue-50/80 p-6 my-10 dark:border-blue-500/20 dark:bg-blue-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200'>Choisissez votre chemin</p>
  <div class='grid gap-6 md:grid-cols-2 mt-5'>
    <div class='rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-500/10 dark:bg-slate-900/40'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>Monorepo</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Ideal pour les contributeurs, auteurs de plugins et equipes qui veulent travailler directement dans tous les packages partages.</p>
    </div>
    <div class='rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-500/10 dark:bg-slate-900/40'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>Starter CLI</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Ideal pour demarrer une app Next.js prete a deployer avec NextBlock&trade; deja integre.</p>
    </div>
  </div>
</div>

<figure class='my-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10'>
  <img src='/images/included.webp' alt='Visuel NextBlock&trade; montrant le CMS, les blocs et les integrations qui arrivent ensemble' class='w-full h-auto object-cover' />
  <figcaption class='border-t border-white/10 px-6 py-4 text-sm text-slate-300'>Quel que soit le chemin choisi, vous heritez du meme editeur de blocs, du meme shell CMS et du meme langage produit.</figcaption>
</figure>

<div class='rounded-[2rem] border border-amber-200 bg-amber-50/80 p-6 my-10 dark:border-amber-500/20 dark:bg-amber-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>Avant de commencer</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>L'assistant de configuration demande des identifiants de trois services, alors creez-les d'abord :</p>
  <ul class='mt-4 list-disc pl-6 space-y-2 text-sm text-slate-700 dark:text-slate-200'>
    <li><strong>Projet Supabase</strong> &ndash; Reference ID (Project Settings &gt; General), chaine de connexion (Connect &gt; Direct connection &gt; URI), les cles anon et service_role, et un Personal Access Token (Account &gt; Access Tokens).</li>
    <li><strong>Bucket Cloudflare R2</strong> &ndash; creez un bucket, activez son Public Development URL, et creez un Account API token avec Object Read &amp; Write. Copiez l'Access Key ID et la Secret Access Key (affichee une seule fois).</li>
    <li><strong>Identifiants SMTP</strong> &ndash; SMTP2GO fonctionne tres bien ; requis pour que Supabase envoie le lien de confirmation dont votre premier admin a besoin pour se connecter.</li>
  </ul>
</div>

<h2>Chemin 1 : cloner le monorepo</h2>
<p>Cette option est la meilleure si vous voulez tout le workspace Nx et chaque package interne disponible en local.</p>

<div class='grid gap-6 md:grid-cols-2 my-8'>
  <div class='rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>Vous obtenez</p>
    <ul class='mt-4 list-disc pl-5 space-y-2 text-sm'>
      <li>Le site public, l'app CMS, le code du CLI et les librairies partagees</li>
      <li>Un acces direct a <code>libs/</code> pour les blocs et modules personnalises</li>
      <li>Les outils de workspace comme <code>nx graph</code> pour visualiser les dependances</li>
    </ul>
  </div>
  <div class='rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>Bon choix pour</p>
    <ul class='mt-4 list-disc pl-5 space-y-2 text-sm'>
      <li>Les mainteneurs et contributeurs coeur</li>
      <li>Les equipes qui construisent des extensions sur mesure</li>
      <li>Les agences qui veulent un controle complet de la plateforme</li>
    </ul>
  </div>
</div>

<pre><code>git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run setup</code></pre>

<p>L'assistant <code>npm run setup</code> cree <code>.env.local</code>, collecte vos identifiants Supabase, Cloudflare R2 et SMTP, genere les secrets locaux (<code>CRON_SECRET</code>, <code>DRAFT_MODE_SECRET</code>, <code>REVALIDATE_SECRET_TOKEN</code>), lie le CLI Supabase et applique le schema complet a votre base avec <code>npm run db:migrate:fresh</code>.</p>

<p>Puis lancez l'application :</p>
<pre><code>npx nx serve nextblock</code></pre>

<div class='rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 my-8 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Premiere connexion</p>
  <p class='mt-3 mb-0 text-sm text-slate-700 dark:text-slate-200'>Le serveur de dev tourne sur <code>http://localhost:4200</code>. Ouvrez <code>/sign-up</code> et creez votre compte &ndash; le premier compte inscrit devient automatiquement l'administrateur. Confirmez votre email (ou confirmez l'utilisateur dans Supabase &gt; Authentication &gt; Users), puis connectez-vous pour acceder au CMS sur <code>/cms/dashboard</code>.</p>
</div>

<p>Commandes utiles dans le monorepo :</p>
<pre><code># Build de tous les packages
npm run all-builds

# Lint de l'application principale
npm run nx:lint:nextblock

# Regenerer les types base de donnees
npm run db:types

# Inspecter les relations du workspace
npx nx graph</code></pre>

<h2>Chemin 2 : utiliser le starter CLI</h2>
<p>Si votre but est d'aller vite, le CLI vous donne une app Next.js autonome avec NextBlock&trade; deja integre.</p>

<pre><code>npm create nextblock@latest mon-site
cd mon-site</code></pre>

<p>Le CLI copie un template pret pour la production, remplace les imports workspace par les packages publies, et peut lancer la meme configuration initiale. Le resultat reste une app Next.js classique, sans dependance a Nx, donc <code>npm run dev</code> la sert sur <code>http://localhost:3000</code>.</p>

<p>Configurez votre environnement dans <code>.env.local</code> :</p>
<pre><code>NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_URL=http://localhost:3000</code></pre>

<p>Poussez le schema puis demarrez :</p>
<pre><code>npm run db:push
npm run dev</code></pre>

<div class='rounded-3xl border border-amber-200 bg-amber-50/80 p-6 my-8 dark:border-amber-500/20 dark:bg-amber-500/10'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200'>Conseil</p>
  <p class='mb-0 text-sm text-slate-700 dark:text-slate-200'>Le chemin CLI est le moyen le plus rapide d'evaluer NextBlock&trade; avec votre propre modele de contenu avant de passer, si besoin, au workspace complet.</p>
</div>

<h2>Activer les modules premium</h2>
<p>Pour un projet genere via le CLI, le package commerce peut etre active avec une seule commande :</p>
<pre><code>npx create-nextblock activate ecommerce</code></pre>
<p>Cette commande injecte les wrappers pour <code>/cms/orders</code>, <code>/cms/products</code>, <code>/checkout</code> et l'API checkout, le tout protege par <code>verifyPackageOnline()</code> afin de garder les routes premium alignees avec la licence.</p>

<h2>Deploiement</h2>
<p>NextBlock&trade; se deploie comme une app Next.js standard. Publiez sur Vercel, Netlify ou tout hebergeur Node.js, puis configurez les variables serveur comme la cle service role Supabase, les identifiants R2, le SMTP et <code>CRON_SECRET</code>, et definissez <code>NEXT_PUBLIC_URL</code> sur votre domaine de production.</p>$$
), 0 FROM target_posts tp WHERE tp.slug = 'comment-configurer-nextblock';
