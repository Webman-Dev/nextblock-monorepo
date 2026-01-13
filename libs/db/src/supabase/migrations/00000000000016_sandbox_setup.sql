-- 00000000000016_sandbox_setup.sql
-- Sandbox Mode: Master Reset Function and Security Triggers

-- 1. Create the Master Reset Function
CREATE OR REPLACE FUNCTION public.reset_sandbox()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges (admin)
AS $function$
DECLARE
  v_admin_id uuid;
  v_logo_media_id uuid := gen_random_uuid();
  v_feature_media_id uuid := gen_random_uuid();
  v_home_page_group_id uuid := gen_random_uuid();
  v_blog_page_group_id uuid := gen_random_uuid();
  v_how_it_works_post_group_id uuid := gen_random_uuid();
  v_en_lang_id bigint;
  v_fr_lang_id bigint;
  v_home_page_id bigint;
  v_blog_page_id bigint;
  v_home_page_fr_id bigint;
  v_blog_page_fr_id bigint;
BEGIN
  -- A. TRUNCATE Tables (Clean Slate)
  TRUNCATE TABLE 
    public.pages, 
    public.posts, 
    public.media, 
    public.navigation_items, 
    public.blocks, 
    public.page_revisions,
    public.post_revisions,
    public.logos
  RESTART IDENTITY CASCADE;

  -- B. RESTORE SEED DATA

  -- 1. Translations
  INSERT INTO public.translations (key, translations) VALUES
  ('sign_in', '{"en": "Sign in", "fr": "Connexion"}'),
  ('sign_up', '{"en": "Sign up", "fr": "Inscription"}'),
  ('sign_out', '{"en": "Sign out", "fr": "Déconnexion"}'),
  ('dont_have_account', '{"en": "Don''t have an account?", "fr": "Pas encore de compte ?"}'),
  ('email', '{"en": "Email", "fr": "Email"}'),
  ('you_at_example_com', '{"en": "you@example.com", "fr": "vous@example.com"}'),
  ('password', '{"en": "Password", "fr": "Mot de passe"}'),
  ('forgot_password', '{"en": "Forgot Password?", "fr": "Mot de passe oublié ?"}'),
  ('your_password', '{"en": "Your password", "fr": "Votre mot de passe"}'),
  ('signing_in_pending', '{"en": "Signing In...", "fr": "Connexion en cours..."}'),
  ('already_have_account', '{"en": "Already have an account?", "fr": "Déjà un compte ?"}'),
  ('signing_up_pending', '{"en": "Signing up...", "fr": "Inscription en cours..."}'),
  ('reset_password', '{"en": "Reset Password", "fr": "Réinitialiser le mot de passe"}'),
  ('blog_prefix', '{"en": "article", "fr": "article"}'),
  ('edit_page', '{"en": "Edit Page", "fr": "Éditer la page"}'),
  ('edit_post', '{"en": "Edit Post", "fr": "Éditer l''article"}'),
  ('open_main_menu', '{"en": "Open main menu", "fr": "Ouvrir le menu principal"}'),
  ('mobile_navigation_menu', '{"en": "Mobile navigation menu", "fr": "Menu de navigation mobile"}'),
  ('cms_dashboard', '{"en": "CMS Dashboard", "fr": "Tableau de bord CMS"}'),
  ('update_env_file_warning', '{"en": "Please update .env.local file with anon key and url", "fr": "Veuillez mettre à jour .env.local avec l''anon key et l''URL"}'),
  ('greeting', '{"en": "Hey, {username}!", "fr": "Salut, {username} !"}'),
  ('theme_switcher', '{"en": "Theme Switcher", "fr": "Sélecteur de thème"}'),
  ('theme_light', '{"en": "Light", "fr": "Clair"}'),
  ('theme_dark', '{"en": "Dark", "fr": "Sombre"}'),
  ('theme_system', '{"en": "System", "fr": "Système"}'),
  ('theme_vibrant', '{"en": "Vibrant", "fr": "Vibrant"}')
  ON CONFLICT (key) DO UPDATE SET translations = EXCLUDED.translations;

  -- 2. Media & Logo
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;

  INSERT INTO public.media (id, uploader_id, file_name, object_key, file_type, size_bytes, description)
  VALUES (
    v_logo_media_id,
    v_admin_id,
    'nextblock-logo-small.webp',
    '/images/nextblock-logo-small.webp',
    'image/webp',
    10000,
    'NextBlock Site Logo'
  );

  INSERT INTO public.logos (name, media_id)
  VALUES ('NextBlock Logo', v_logo_media_id);

  -- 3. Foundational Content
  SELECT id INTO v_en_lang_id FROM public.languages WHERE code = 'en' LIMIT 1;
  SELECT id INTO v_fr_lang_id FROM public.languages WHERE code = 'fr' LIMIT 1;

  IF v_en_lang_id IS NULL OR v_fr_lang_id IS NULL THEN
    RAISE EXCEPTION 'Required languages (en, fr) not found.';
  END IF;

  INSERT INTO public.pages (language_id, title, slug, status, translation_group_id)
  VALUES 
    (v_en_lang_id, 'Home', 'home', 'published', v_home_page_group_id),
    (v_fr_lang_id, 'Accueil', 'accueil', 'published', v_home_page_group_id),
    (v_en_lang_id, 'Articles', 'articles', 'published', v_blog_page_group_id),
    (v_fr_lang_id, 'Articles', 'articles', 'published', v_blog_page_group_id);

  INSERT INTO public.media (id, file_name, object_key, file_type, size_bytes)
  VALUES (v_feature_media_id, 'programmer-upscaled.webp', '/images/programmer-upscaled.webp', 'image/webp', 100000);

  INSERT INTO public.posts (language_id, title, slug, status, translation_group_id, feature_image_id)
  VALUES 
    (v_en_lang_id, 'How NextBlock Works: A Look Under the Hood', 'how-nextblock-works', 'published', v_how_it_works_post_group_id, v_feature_media_id),
    (v_fr_lang_id, 'Comment NextBlock Fonctionne : Regard Sous le Capot', 'comment-nextblock-fonctionne', 'published', v_how_it_works_post_group_id, v_feature_media_id);

  -- RESTORE HOME PAGE BLOCKS & HOW IT WORKS CONTENT
  SELECT id INTO v_home_page_id FROM public.pages WHERE slug = 'home' AND language_id = v_en_lang_id;
  SELECT id INTO v_blog_page_id FROM public.pages WHERE slug = 'articles' AND language_id = v_en_lang_id;
  SELECT id INTO v_home_page_fr_id FROM public.pages WHERE slug = 'accueil' AND language_id = v_fr_lang_id;
  SELECT id INTO v_blog_page_fr_id FROM public.pages WHERE slug = 'articles' AND language_id = v_fr_lang_id;

  -- INSERT: How It Works Content
  INSERT INTO public.blocks (post_id, language_id, block_type, content, "order")
  VALUES
  (
    (SELECT id FROM public.posts WHERE slug = 'how-nextblock-works' AND language_id = v_en_lang_id),
    v_en_lang_id,
    'text',
    jsonb_build_object(
      'html_content',
      $$<h2>How NextBlock Works: Architecture for a Visual-First CMS</h2>
<p>NextBlock is purpose-built to feel like a polished product from day one, and that polish starts with the Nx monorepo. Applications and libraries sit side-by-side so the same code that powers the hosted CMS experience also ships inside the open-source template and CLI. Instead of scattering configuration across projects, TypeScript paths, Tailwind presets, and shared lint rules all originate from the workspace root, which keeps every downstream package aligned.</p>
<div class='flex flex-col md:flex-row gap-8 items-start my-8'>
  <div class='w-full md:w-3/5 space-y-4'>
    <h3>Monorepo Layout and Dependency Flow</h3>
    <p>The <code>apps/nextblock</code> directory contains the production Next.js interface—both the public site and the authenticated CMS. The <code>apps/create-nextblock</code> CLI mirrors it, syncing files from the main app before publishing a scaffolding tool. Reusable primitives live under <code>libs/</code>. UI components and design tokens are exported from <code>@nextblock-cms/ui</code>, cross-cutting helpers (translations, R2 clients, Supabase environment guards) live in <code>@nextblock-cms/utils</code>, and database code plus migrations are centralized inside <code>@nextblock-cms/db</code>. Future-facing work, like the SDK and e-commerce module, already have dedicated libraries so they can mature without disrupting the core runtime.</p>
    <p>This organization matters because Nx understands project boundaries. When you run <code>nx graph</code> you see exactly how a change in the editor package might ripple into the Next.js app. Path aliases from <code>tsconfig.base.json</code> and the shared <code>tailwind.config.js</code> ensure that every consumer sees the same theme scales and helper utilities, which is crucial for a system that promises design parity between marketing pages, admin screens, and scaffolded customer projects.</p>
    <p>Together, those guardrails mean features can ship quickly without regressions. Schema migrations live in <code>libs/db</code>, UI primitives live in <code>libs/ui</code>, and the CLI simply syncs changes downstream—no copy/paste debt, no drifting configs.</p>
  </div>
  <aside class='md:w-2/5 bg-muted/40 border border-border/40 rounded-2xl p-4 shadow-lg text-center'>
    <img src='/images/nx-graph.webp' alt='Nx project graph preview' class='w-full h-auto object-cover rounded-lg' />
    <p class='text-sm text-muted-foreground mt-3'>Nx keeps every workspace relationship visible.</p>
  </aside>
</div>
<h3>Inside the CMS Application</h3>
<p>Within <code>apps/nextblock/app/cms</code>, each feature area—pages, posts, media, navigation, users, settings—follows a predictable file pattern: a list page, creation and edit routes, server actions, and scoped client components. The root CMS layout enforces authentication, builds the shell (sidebar, responsive header, profile menu), and injects role-aware navigation. That means writers can jump straight into the block editor while admins unlock additional menus such as language management or user provisioning, all without duplicating layout logic.</p>
<p>Server actions wrap Supabase calls so mutations never leak credentials into the browser. Media uploads coordinate with Cloudflare R2, navigation management includes drag-and-drop ordering, and every table interaction respects the row-level security policies defined in the Supabase migrations—e.g., only admins and writers can mutate pages or posts while anonymous traffic can only read published content.</p>
<h3>Tech Stack and Runtime</h3>
<p>The stack highlighted in the project README—Next.js 16, Supabase, Tailwind CSS, and shadcn/ui—was selected to balance developer velocity with runtime performance. Next.js App Router unlocks Server Components, streaming, and incremental static regeneration so marketing experiences remain edge-fast. Supabase covers Postgres, Auth, and Storage, shrinking the operational footprint while still allowing custom SQL migrations. Tailwind plus shadcn/ui provide composable building blocks so the CMS interface, marketing site, and generated client projects all inherit the same visual language.</p>
<p>Nx tooling ties it together. Common commands such as <code>nx serve nextblock</code>, <code>nx build nextblock</code>, or workspace-wide tasks like <code>nx run-many -t lint --all</code> respect dependency caching, so even large rebuilds feel snappy during the 100-day roadmap.</p>
<pre><code>nx serve nextblock
nx run-many -t build --all
supabase db push
</code></pre>
<h3>The Tiptap-Based Block Editor</h3>
<p>The <code>@nextblock-cms/editor</code> package turns Tiptap v3 into a polished, reusable editing surface. It ships rich-text formatting, tables, task lists, slash commands, floating and bubble menus, character counts, focus mode, and syntax-highlighted code blocks. Under the hood it bundles StarterKit, TextStyleKit, CodeBlockLowlight, Image, TaskList, Table, Link, TextAlign, Highlight, Typography, and more. Because the editor is published as a standalone library, both the CMS and the generated template pull identical behavior, ensuring content parity.</p>
<p>From an implementation standpoint, the editor exposes granular components—EditorToolbar, BubbleMenu, FloatingMenu—so the CMS can embed one cohesive editing experience while keeping the door open for agencies or plugin developers to compose their own UI. Comprehensive CSS hooks (e.g., <code>.tiptap pre</code> for code blocks) mean that teams can layer in dark-mode friendly themes without forking the core package.</p>
<h3>Putting It All Together</h3>
<p>The result is a platform where architecture decisions reinforce each other: the Nx workspace keeps libraries honest, the Next.js app enforces UX consistency, Supabase migrations codify access rules, and the Tiptap editor guarantees that content collaborators see the same tooling regardless of deployment. When a new team runs <code>npm create nextblock</code>, they inherit not just a starter site, but the entire operational philosophy described above—ready to extend with SDKs, premium modules, and marketplace blocks as the ecosystem grows.</p>$$
    ),
    0
  ),
  (
    (SELECT id FROM public.posts WHERE slug = 'comment-nextblock-fonctionne' AND language_id = v_fr_lang_id),
    v_fr_lang_id,
    'text',
    jsonb_build_object(
      'html_content',
      $$<h2>Comment NextBlock fonctionne : architecture pour un CMS axé sur l'expérience visuelle</h2>
<p>NextBlock est conçu pour fonctionner dès le premier jour avec un socle Nx. Applications et librairies cohabitent pour que le même code propulse l'expérience CMS hébergée et le template open-source. Au lieu d'éparpiller la configuration, les chemins TypeScript, le preset Tailwind et les règles lint sont centralisés à la racine, gardant tous les packages alignés.</p>
<div class='flex flex-col md:flex-row gap-8 items-start my-8'>
  <div class='w-full md:w-3/5 space-y-4'>
    <h3>Architecture monorepo et flux de dépendances</h3>
    <p>Le dossier <code>apps/nextblock</code> contient l'interface Next.js (site public + CMS). Le CLI <code>apps/create-nextblock</code> la reflète et publie un outil de scaffolding. Les briques réutilisables vivent dans <code>libs/</code> : UI et design tokens via <code>@nextblock-cms/ui</code>, helpers (traductions, R2, règles Supabase) via <code>@nextblock-cms/utils</code>, et la base de données + migrations dans <code>@nextblock-cms/db</code>. Les travaux futurs (SDK, e-commerce) ont déjà leurs librairies dédiées.</p>
    <p>Ce découplage est lisible via <code>nx graph</code> : un changement dans l'éditeur impacte clairement les apps dépendantes. Les alias de <code>tsconfig.base.json</code> et le <code>tailwind.config.js</code> partagé assurent une cohérence de thème et d'outils entre pages marketing, back-office et projets générés.</p>
    <p>En pratique, cela accélère les livraisons sans régressions : migrations dans <code>libs/db</code>, primitives UI dans <code>libs/ui</code>, et le CLI synchronise simplement en aval—pas de dettes de copier/coller ni de configs divergentes.</p>
  </div>
  <aside class='md:w-2/5 bg-muted/40 border border-border/40 rounded-2xl p-4 shadow-lg text-center'>
    <img src='/images/nx-graph.webp' alt='Aperçu du graph Nx' class='w-full h-auto object-cover rounded-lg' />
    <p class='text-sm text-muted-foreground mt-3'>Nx rend visibles toutes les relations du workspace.</p>
  </aside>
</div>
<h3>Stack technique et exécution</h3>
<p>Le stack—Next.js 16, Supabase, Tailwind CSS, shadcn/ui—équilibre vélocité et performance. L'App Router active les Server Components et l'ISR pour un rendu edge rapide. Supabase gère Postgres/Auth/Storage, réduisant l'opérationnel tout en gardant la liberté SQL. Tailwind + shadcn/ui fournissent des blocs réutilisables pour le CMS, le site marketing et les projets générés.</p>
<pre><code>nx serve nextblock
nx run-many -t build --all
supabase db push
</code></pre>
<h3>Éditeur basé sur Tiptap</h3>
<p>Le package <code>@nextblock-cms/editor</code> transforme Tiptap v3 en surface d'édition robuste : mise en forme riche, menus contextuels, compteurs de caractères, blocs de code avec syntax highlighting, tables, listes de tâches, et plus. Éditor et template consomment la même librairie pour garantir la parité de contenu.</p>
<h3>En résumé</h3>
<p>Chaque choix architectural se renforce : Nx garde les dépendances lisibles, l'app Next.js impose une UX cohérente, les migrations Supabase codifient l'accès, et l'éditeur Tiptap assure une expérience identique pour tous les contributeurs.</p>$$
    ),
    0
  );

  -- INSERT: Homepage Blocks
  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
  VALUES
    (
      v_home_page_id,
      v_en_lang_id,
      'hero',
      $${
        "container_type": "container",
        "background": {
          "type": "gradient",
          "gradient": {
            "type": "linear",
            "direction": "135deg",
            "stops": [
              { "color": "#020817", "position": 0 },
              { "color": "#0f172a", "position": 50 },
              { "color": "#1e293b", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 2 },
        "column_gap": "xl",
        "vertical_alignment": "center",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<h1 class='text-5xl md:text-6xl font-extrabold tracking-tight text-white text-center leading-tight'>Build <span class='relative inline-block mx-1 group'><span class='absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 translate-y-1 md:translate-y-2 transform -skew-x-12 rounded-sm shadow-lg group-hover:skew-x-0 transition-transform duration-300 ease-out'></span><span class='relative text-white italic px-1'>Blazing-Fast</span></span><br class='md:hidden' /> Websites.</h1>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-xl text-slate-300 text-center max-w-3xl mx-auto mt-4 leading-relaxed'>NextBlock is the open-source, developer-first Next.js CMS that merges 100% Lighthouse scores with a powerful visual block editor.</p>"
              }
            },
            {
              "block_type": "button",
              "content": {
                "text": "Get Started",
                "url": "/article/how-nextblock-works",
                "variant": "default",
                "size": "lg",
                "position": "center"
              }
            },
            {
              "block_type": "button",
              "content": {
                "text": "View on GitHub",
                "url": "https://github.com/nextblock-cms/nextblock",
                "variant": "outline",
                "size": "lg",
                "position": "center"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='flex flex-wrap justify-center gap-6 text-sm uppercase tracking-wide text-slate-400 mt-8'><a href='https://github.com/nextblock-cms' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>GitHub</a><a href='https://x.com/NextBlockCMS' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>X</a><a href='https://www.linkedin.com/in/nextblock/' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>LinkedIn</a><a href='https://dev.to/nextblockcms' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>Dev.to</a><a href='https://www.npmjs.com/~nextblockcms' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>npm</a></div>"
              }
            }
          ],
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='p-10 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group'><div class='absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500'></div><div class='relative z-10'><p class='text-xs text-white uppercase tracking-widest font-semibold mb-2'>Why teams switch</p><p class='text-3xl font-bold text-white mb-2'>100% Lighthouse</p><p class='text-base text-slate-300 mb-6'>Edge-rendered marketing sites, launches, and docs with uncompromising performance.</p><ul class='space-y-3 text-sm text-slate-200'><li><span class='text-blue-400 mr-2'>✓</span> Next.js 16 with ISR and edge caching</li><li><span class='text-blue-400 mr-2'>✓</span> Supabase auth, data, and storage</li><li><span class='text-blue-400 mr-2'>✓</span> Notion-style block editor powered by Tiptap</li></ul><div class='mt-6 rounded-2xl overflow-hidden border border-white/10 shadow-lg'><img src='/images/NBcover.webp' alt='Nextblock cover showcasing dashboards and blocks' class='w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700' fetchpriority='high' /></div></div></div>"
              }
            }
          ]
        ]
      }$$::jsonb,
      0
    ),
    (
      v_home_page_id,
      v_en_lang_id,
      'section',
      $${
        "container_type": "container",
        "background": { "type": "none" },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "heading",
              "content": {
                "level": 2,
                "text_content": "Key Features: The Three Pillars of NextBlock",
                "textAlign": "center"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-lg text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto'>NextBlock is a holistic platform that unites performance, editorial experience, and developer control so every stakeholder delivers their best work.</p>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='grid gap-8 md:grid-cols-3 mt-12'><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300'><div class='w-12 h-12 rounded-xl flex items-center justify-center text-black dark:text-white mb-6'><svg class='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'></path></svg></div><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>Built for Speed.</h3><p class='text-sm text-slate-600 dark:text-slate-400 leading-relaxed'>Architected for 100% Lighthouse scores with global delivery and near-instant FCP.</p><ul class='mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400'><li><strong class='text-slate-800 dark:text-slate-200'>Edge Caching & ISR:</strong> Serve pages worldwide.</li><li><strong class='text-slate-800 dark:text-slate-200'>Critical CSS:</strong> Inline styles to eliminate blocking.</li><li><strong class='text-slate-800 dark:text-slate-200'>Image Opt:</strong> AVIF & blurred placeholders.</li></ul></div><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300'><div class='w-12 h-12 rounded-xl flex items-center justify-center text-black  dark:text-white mb-6'><svg class='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'></path></svg></div><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>Editor-First Experience.</h3><p class='text-sm text-slate-600 dark:text-slate-400 leading-relaxed'>A low-code, Notion-style block editor empowers teams to ship pages without engineering help.</p><ul class='mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400'><li><strong class='text-slate-800 dark:text-slate-200'>Notion-Style:</strong> Slash commands & drag-and-drop.</li><li><strong class='text-slate-800 dark:text-slate-200'>Bilingual:</strong> Manage locales from one interface.</li><li><strong class='text-slate-800 dark:text-slate-200'>History:</strong> Restore any version with a click.</li></ul></div><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300'><div class='w-12 h-12 bg-white/50 dark:bg-white/10 rounded-xl flex items-center justify-center mb-6'><svg class='w-6 h-6 text-slate-900 dark:text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'></path></svg></div><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>Infinitely Extensible.</h3><p class='text-sm text-slate-700 dark:text-slate-200 leading-relaxed'>Open-source control with a clean Nx monorepo and a typed SDK for limitless customization.</p><ul class='mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200'><li><strong class='text-slate-900 dark:text-white'>Open Source:</strong> Own the code & data forever.</li><li><strong class='text-slate-900 dark:text-white'>Nx Monorepo:</strong> Scale confidently.</li><li><strong class='text-slate-900 dark:text-white'>Developer SDK:</strong> Scaffold blocks in minutes.</li></ul></div></div>"
              }
            }
          ]
        ]
      }$$::jsonb,
      1
    ),
    (
      v_home_page_id,
      v_en_lang_id,
      'section',
      $${
        "container_type": "container",
        "background": {
          "type": "gradient",
          "gradient": {
            "type": "linear",
            "direction": "180deg",
            "stops": [
              { "color": "#0f172a", "position": 0 },
              { "color": "#020817", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<h2 class='text-3xl md:text-4xl font-bold text-white text-center mb-6'>Built with the Best.</h2>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-slate-400 text-center max-w-2xl mx-auto'>Every layer of NextBlock leans on proven developer-first technology so the platform feels familiar, performant, and trustworthy from day one.</p><div class='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-10 text-sm font-semibold text-center text-white'><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Next.js</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>React</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Supabase</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Tailwind</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>shadcn/ui</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Tiptap</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Vercel</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Nx</div></div>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<h2 class='text-3xl md:text-4xl font-bold text-white text-center mb-6 mt-16'>Powerful for Developers. Intuitive for Editors.</h2>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='grid md:grid-cols-2 gap-8 mt-10 text-white'><div class='p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm'><h3 class='text-xl font-bold mb-6 text-blue-400'>For Content Creators</h3><ul class='space-y-4 text-sm text-slate-300'><li><strong class='text-white block mb-1'>Intuitive Block Editor</strong>Drag-and-drop layouts with a Notion-like interface.</li><li><strong class='text-white block mb-1'>Rich Content Blocks</strong>Deploy heroes, galleries, testimonials, and more in one click.</li><li><strong class='text-white block mb-1'>Effortless Media Management</strong>Organize assets with folders, tags, and bulk actions.</li><li><strong class='text-white block mb-1'>Worry-Free Revisions</strong>Automatic version history with instant restore.</li></ul></div><div class='p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm'><h3 class='text-xl font-bold mb-6 text-purple-400'>For Developers</h3><ul class='space-y-4 text-sm text-slate-300'><li><strong class='text-white block mb-1'>Next.js 16 Core</strong>Server Components, ISR, and Edge Functions ready out of the box.</li><li><strong class='text-white block mb-1'>Supabase Integration</strong>Postgres, auth, storage, and real-time APIs without glue code.</li><li><strong class='text-white block mb-1'>Monorepo Ready</strong>Nx-powered dev experience for scalable architectures.</li><li><strong class='text-white block mb-1'>Extensible Block SDK</strong>Ship fully typed custom blocks and widgets.</li></ul></div></div>"
              }
            }
          ]
        ]
      }$$::jsonb,
      2
    ),
    (
      v_home_page_id,
      v_en_lang_id,
      'section',
      $${
        "container_type": "container",
        "background": { "type": "none" },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "heading",
              "content": {
                "level": 2,
                "text_content": "More Than a CMS. An Ecosystem.",
                "textAlign": "center"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto'>NextBlock is building a sustainable open-core roadmap so the platform grows with your business.</p>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='grid md:grid-cols-2 gap-6 mt-10'><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-blue-500/30 transition-colors'><p class='text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2 font-bold'>Coming Soon</p><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>NextBlock Commerce</h3><p class='text-sm text-slate-600 dark:text-slate-400'>Transform your site into a composable storefront. The premium module ships product management, seamless Stripe payments, and e-commerce blocks that drop directly into the editor.</p></div><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-purple-500/30 transition-colors'><p class='text-xs uppercase tracking-wide text-black dark:text-white mb-2 font-bold'>Build the Future</p><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>Plugin & Block Marketplace</h3><p class='text-sm text-slate-600 dark:text-slate-400'>A community-driven marketplace invites developers to publish and monetize custom blocks, themes, and plugins—turning NextBlock into an extensible ecosystem.</p></div></div>"
              }
            },
            {
              "block_type": "heading",
              "content": {
                "level": 2,
                "text_content": "Join Our Community.",
                "textAlign": "center"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-slate-600 dark:text-slate-400 text-center mx-auto'>NextBlock is being built in the open. Star the repo, share feedback, and help define the future of performance-first content management.</p>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='grid gap-4 md:grid-cols-3 mt-10 text-sm'><a class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]' href='https://github.com/nextblock-cms' target='_blank' rel='noopener noreferrer'><strong class='block text-base text-slate-900 dark:text-white mb-1'>GitHub</strong><span class='text-slate-600 dark:text-slate-400'>Star the repo & contribute</span></a><a class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]' href='https://x.com/NextBlockCMS' target='_blank' rel='noopener noreferrer'><strong class='block text-base text-slate-900 dark:text-white mb-1'>X (Twitter)</strong><span class='text-slate-600 dark:text-slate-400'>Follow updates & announcements</span></a><a class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]' href='https://dev.to/nextblockcms' target='_blank' rel='noopener noreferrer'><strong class='block text-base text-slate-900 dark:text-white mb-1'>Dev.to</strong><span class='text-slate-600 dark:text-slate-400'>Read technical deep dives</span></a></div>"
              }
            }
          ]
        ]
      }$$::jsonb,
      3
    ),
    (
      v_home_page_id,
      v_en_lang_id,
      'section',
      $${
        "container_type": "container",
        "background": {
          "type": "gradient",
          "gradient": {
            "type": "linear",
            "direction": "180deg",
            "stops": [
              { "color": "#020817", "position": 0 },
              { "color": "#0f172a", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<h2 class='text-3xl md:text-4xl font-bold text-center text-white mb-4'>Have Questions?</h2>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-center text-lg text-slate-300 mx-auto mb-8'>NextBlock partners with early adopters to co-build features, sponsor modules, and shape the product direction.</p>"
              }
            },
            {
              "block_type": "button",
              "content": {
                "text": "Get in Touch",
                "url": "mailto:hello@nextblockcms.com",
                "variant": "default",
                "size": "lg",
                "position": "center"
              }
            }
          ]
        ]
      }$$::jsonb,
      4
    ),
    (
      v_blog_page_id,
      v_en_lang_id,
      'hero',
      $${
        "container_type": "container",
        "background": {
          "type": "gradient",
          "gradient": {
            "type": "linear",
            "direction": "135deg",
            "stops": [
              { "color": "#020817", "position": 0 },
              { "color": "#1e293b", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 2 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-sm uppercase tracking-[0.3em] text-blue-400 font-bold text-center md:text-left mb-4'>The Nextblock Journal</p>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<h2 class='text-4xl md:text-5xl font-bold text-white text-center md:text-left mb-6'>Deep dives into performance, DX, and visual editing.</h2>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-slate-300 text-lg max-w-xl mx-auto md:mx-0 text-center md:text-left leading-relaxed'>Explore architectural walkthroughs, Supabase recipes, and block editor experiments written by the Nextblock core team.</p>"
              }
            },
            {
              "block_type": "button",
              "content": {
                "text": "Explore Articles",
                "url": "/articles#latest",
                "variant": "default",
                "size": "lg"
              }
            },
            {
              "block_type": "button",
              "content": {
                "text": "Subscribe for Updates",
                "url": "https://github.com/nextblock-cms/nextblock/discussions",
                "variant": "outline",
                "size": "lg"
              }
            }
          ],
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='h-full flex items-center justify-center rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl p-4 backdrop-blur-sm'><img src='/images/developer.webp' alt='Developer working with the Nextblock stack' class='w-full object-cover rounded-2xl shadow-lg' style='max-width: 400px;' /></div>"
              }
            }
          ]
        ]
      }$$::jsonb,
      0
    ),
    (
      v_blog_page_id,
      v_en_lang_id,
      'posts_grid',
      $${
        "postsPerPage": 6,
        "columns": 3,
        "showPagination": true,
        "title": "Latest Deep Dives"
      }$$::jsonb,
      1
    ),
    (
      v_home_page_fr_id,
      v_fr_lang_id,
      'hero',
      $${
        "container_type": "container",
        "background": {
          "type": "gradient",
          "gradient": {
            "type": "linear",
            "direction": "135deg",
            "stops": [
              { "color": "#020817", "position": 0 },
              { "color": "#0f172a", "position": 50 },
              { "color": "#1e293b", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 2 },
        "column_gap": "xl",
        "vertical_alignment": "center",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            { "block_type": "text", "content": { "html_content": "<h1 class='text-5xl md:text-6xl font-bold tracking-tight text-white text-center drop-shadow-lg'>Créez des sites <span class='relative inline-block mx-1 group'><span class='absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 translate-y-1 md:translate-y-2 transform -skew-x-12 rounded-sm shadow-lg group-hover:skew-x-0 transition-transform duration-300 ease-out'></span><span class='relative text-white italic px-1'>Ultra-Rapides</span></span><br class='md:hidden' />.</h1>" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-xl text-slate-300 text-center max-w-3xl mx-auto mt-4 leading-relaxed'>NextBlock est le CMS Next.js open-source alliant scores Lighthouse parfaits et éditeur visuel puissant.</p>" } },
            { "block_type": "button", "content": { "text": "Commencer", "url": "/article/comment-nextblock-fonctionne", "variant": "default", "size": "lg", "position": "center" } },
            { "block_type": "button", "content": { "text": "Voir sur GitHub", "url": "https://github.com/nextblock-cms/nextblock", "variant": "outline", "size": "lg", "position": "center" } },
            { "block_type": "text", "content": { "html_content": "<div class='flex flex-wrap justify-center gap-6 text-sm uppercase tracking-wide text-slate-400 mt-8'><a href='https://github.com/nextblock-cms' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>GitHub</a><a href='https://x.com/NextBlockCMS' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>X</a><a href='https://www.linkedin.com/in/nextblock/' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>LinkedIn</a><a href='https://dev.to/nextblockcms' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>Dev.to</a><a href='https://www.npmjs.com/~nextblockcms' target='_blank' rel='noopener noreferrer' class='hover:text-white transition-colors'>npm</a></div>" } }
          ],
          [
            { "block_type": "text", "content": { "html_content": "<div class='p-10 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group'><div class='absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500'></div><div class='relative z-10'><p class='text-xs text-white uppercase tracking-widest font-semibold mb-2'>Pourquoi migrer</p><p class='text-3xl font-bold text-white mb-2'>100% Lighthouse</p><p class='text-base text-slate-300 mb-6'>Sites marketing et docs rendus à l'edge avec des performances irréprochables.</p><ul class='space-y-3 text-sm text-slate-200'><li><span class='text-blue-400 mr-2'>✓</span> Next.js 16 avec ISR et cache edge</li><li><span class='text-blue-400 mr-2'>✓</span> Supabase pour l'auth, les données et le stockage</li><li><span class='text-blue-400 mr-2'>✓</span> Éditeur de blocs type Notion sur Tiptap</li></ul><div class='mt-6 rounded-2xl overflow-hidden border border-white/10 shadow-lg'><img src='/images/NBcover.webp' alt='Couverture Nextblock avec tableaux de bord et blocs' class='w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700' fetchpriority='high' /></div></div></div>" } }
          ]
        ]
      }$$::jsonb,
      0
    ),
    (
      v_home_page_fr_id,
      v_fr_lang_id,
      'section',
      $${
        "container_type": "container",
        "background": { "type": "none" },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            { "block_type": "heading", "content": { "level": 2, "text_content": "Fonctionnalités clés : les trois piliers de NextBlock", "textAlign": "center" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-lg text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto'>NextBlock unifie performances, expérience éditoriale et contrôle développeur pour que chaque équipe livre son meilleur travail.</p>" } },
            { "block_type": "text", "content": { "html_content": "<div class='grid gap-8 md:grid-cols-3 mt-12'><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300'><div class='w-12 h-12 rounded-xl flex items-center justify-center mb-6'><svg class='w-6 h-6 text-blue-600 dark:text-blue-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'></path></svg></div><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>Vitesse Extrême.</h3><p class='text-sm text-slate-600 dark:text-slate-400 leading-relaxed'>Pensé pour des scores Lighthouse parfaits avec une diffusion mondiale.</p><ul class='mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400'><li><strong class='text-slate-800 dark:text-slate-200'>Edge Caching:</strong> Servez vos pages partout.</li><li><strong class='text-slate-800 dark:text-slate-200'>Critical CSS:</strong> Styles en ligne pour éviter les blocages.</li><li><strong class='text-slate-800 dark:text-slate-200'>Images Opt:</strong> AVIF et placeholders floutés.</li></ul></div><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-300'><div class='w-12 h-12 rounded-xl flex items-center justify-center mb-6'><svg class='w-6 h-6 text-purple-600 dark:text-purple-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'></path></svg></div><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>Expérience Éditeur.</h3><p class='text-sm text-slate-600 dark:text-slate-400 leading-relaxed'>Un éditeur façon Notion pour publier sans dépendre des développeurs.</p><ul class='mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400'><li><strong class='text-slate-800 dark:text-slate-200'>Visuel:</strong> Héros, galeries, témoignages.</li><li><strong class='text-slate-800 dark:text-slate-200'>Média:</strong> Dossiers, tags et actions groupées.</li><li><strong class='text-slate-800 dark:text-slate-200'>Historique:</strong> Restauration complète.</li></ul></div><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-600/20 dark:to-purple-600/20 backdrop-blur-sm hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-600/30 dark:hover:to-purple-600/30 transition-colors duration-300'><div class='w-12 h-12 rounded-xl flex items-center justify-center mb-6'><svg class='w-6 h-6 text-slate-900 dark:text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'></path></svg></div><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>Extensible à l'Infini.</h3><p class='text-sm text-slate-700 dark:text-slate-200 leading-relaxed'>Un socle Next.js + Supabase modulaire, extensible et auto-hébergeable.</p><ul class='mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200'><li><strong class='text-slate-900 dark:text-white'>SDK de blocs:</strong> Composants typés.</li><li><strong class='text-slate-900 dark:text-white'>CLI:</strong> Générez modules en minutes.</li><li><strong class='text-slate-900 dark:text-white'>Monorepo Nx:</strong> Dépendances maintenables.</li></ul></div></div>" } }
          ]
        ]
      }$$::jsonb,
      1
    ),
    (
      v_home_page_fr_id,
      v_fr_lang_id,
      'section',
      $${
        "container_type": "container",
        "background": {
          "type": "gradient",
          "gradient": {
            "type": "linear",
            "direction": "180deg",
            "stops": [
              { "color": "#0f172a", "position": 0 },
              { "color": "#020817", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<h2 class='text-3xl md:text-4xl font-bold text-white text-center mb-6'>Conçu avec les meilleurs outils.</h2>"
              }
            },
            { "block_type": "text", "content": { "html_content": "<p class='text-slate-400 text-center max-w-2xl mx-auto'>Chaque couche de NextBlock repose sur des technologies éprouvées pour offrir une expérience familière, performante et fiable.</p><div class='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-10 text-sm font-semibold text-center text-white'><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Next.js</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>React</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Supabase</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Tailwind</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>shadcn/ui</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Tiptap</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Vercel</div><div class='p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors'>Nx</div></div>" } },
            { "block_type": "text", "content": { "html_content": "<h2 class='text-3xl md:text-4xl font-bold text-white text-center mb-6 mt-16'>Puissant pour les développeurs. Intuitif pour les éditeurs.</h2>" } },
            { "block_type": "text", "content": { "html_content": "<div class='grid md:grid-cols-2 gap-8 mt-10 text-white'><div class='p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm'><h3 class='text-xl font-bold mb-6 text-blue-400'>Pour les créateurs</h3><ul class='space-y-4 text-sm text-slate-300'><li><strong class='text-white block mb-1'>Éditeur de blocs</strong>Glisser-déposer façon Notion.</li><li><strong class='text-white block mb-1'>Blocs riches</strong>Héros, galeries, témoignages.</li><li><strong class='text-white block mb-1'>Médiathèque</strong>Dossiers, tags et actions groupées.</li><li><strong class='text-white block mb-1'>Versions sécurisées</strong>Historique et restauration instantanée.</li></ul></div><div class='p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm'><h3 class='text-xl font-bold mb-6 text-purple-400'>Pour les développeurs</h3><ul class='space-y-4 text-sm text-slate-300'><li><strong class='text-white block mb-1'>Next.js 16</strong>Server Components, ISR et Edge prêts à l'emploi.</li><li><strong class='text-white block mb-1'>Supabase</strong>Postgres, auth, stockage, temps réel.</li><li><strong class='text-white block mb-1'>Monorepo Nx</strong>Dépendances lisibles et centrales.</li><li><strong class='text-white block mb-1'>SDK de blocs</strong>Widgets typés et extensibles.</li></ul></div></div>" } }
          ]
        ]
      }$$::jsonb,
      2
    ),
    (
      v_home_page_fr_id,
      v_fr_lang_id,
      'section',
      $${
        "container_type": "container",
        "background": { "type": "none" },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            { "block_type": "heading", "content": { "level": 2, "text_content": "Plus qu'un CMS. Un écosystème.", "textAlign": "center" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto'>NextBlock construit une feuille de route open-core durable qui évolue avec votre activité.</p>" } },
            { "block_type": "text", "content": { "html_content": "<div class='grid md:grid-cols-2 gap-6 mt-10'><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-blue-500/30 transition-colors'><p class='text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2 font-bold'>Bientôt</p><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>NextBlock Commerce</h3><p class='text-sm text-slate-600 dark:text-slate-400'>Transformez votre site en vitrine composable. Module premium avec gestion produits, paiement Stripe et blocs e-commerce prêts à l'emploi.</p></div><div class='p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-purple-500/30 transition-colors'><p class='text-xs uppercase tracking-wide text-purple-600 dark:text-purple-400 mb-2 font-bold'>Construisez le futur</p><h3 class='text-xl font-bold text-slate-900 dark:text-white mb-3'>Marketplace de plugins & blocs</h3><p class='text-sm text-slate-600 dark:text-slate-400'>Une marketplace communautaire pour publier et monétiser blocs, thèmes et plugins — pour un écosystème extensible.</p></div></div>" } },
            { "block_type": "heading", "content": { "level": 2, "text_content": "Rejoignez la communauté.", "textAlign": "center" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-slate-600 dark:text-slate-400 text-center max-w-3xl mx-auto'>NextBlock se construit en public. Ajoutez une étoile, partagez vos retours et façonnez l'avenir du CMS orienté performance.</p>" } },
            { "block_type": "text", "content": { "html_content": "<div class='grid gap-4 md:grid-cols-3 mt-10 text-sm'><a class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]' href='https://github.com/nextblock-cms' target='_blank' rel='noopener noreferrer'><strong class='block text-base text-slate-900 dark:text-white mb-1'>GitHub</strong><span class='text-slate-600 dark:text-slate-400'>Ajoutez une étoile & contribuez</span></a><a class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]' href='https://x.com/NextBlockCMS' target='_blank' rel='noopener noreferrer'><strong class='block text-base text-slate-900 dark:text-white mb-1'>X (Twitter)</strong><span class='text-slate-600 dark:text-slate-400'>Suivez les annonces</span></a><a class='p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:scale-[1.02]' href='https://dev.to/nextblockcms' target='_blank' rel='noopener noreferrer'><strong class='block text-base text-slate-900 dark:text-white mb-1'>Dev.to</strong><span class='text-slate-600 dark:text-slate-400'>Lisez nos articles techniques</span></a></div>" } }
          ]
        ]
      }$$::jsonb,
      3
    ),
    (
      v_home_page_fr_id,
      v_fr_lang_id,
      'section',
      $${
        "container_type": "container",
        "background": {
          "type": "gradient",
          "gradient": {
            "type": "linear",
            "direction": "180deg",
            "stops": [
              { "color": "#020817", "position": 0 },
              { "color": "#0f172a", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<h2 class='text-3xl md:text-4xl font-bold text-center text-white mb-4'>Des questions ?</h2>"
              }
            },
            { "block_type": "text", "content": { "html_content": "<p class='text-center text-base text-slate-300 max-w-2xl mx-auto'>NextBlock co-construit avec des partenaires : fonctionnalités, modules sponsorisés et direction produit.</p>" } },
            { "block_type": "button", "content": { "text": "Nous contacter", "url": "mailto:hello@nextblockcms.com", "variant": "default", "size": "lg", "position": "center" } }
          ]
        ]
      }$$::jsonb,
      4
    ),
    (
      v_blog_page_fr_id,
      v_fr_lang_id,
      'hero',
      $${
        "container_type": "container",
        "background": {
          "type": "gradient",
          "gradient": {
            "type": "linear",
            "direction": "135deg",
            "stops": [
              { "color": "#020817", "position": 0 },
              { "color": "#1e293b", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 2 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            { "block_type": "text", "content": { "html_content": "<p class='text-sm uppercase tracking-[0.3em] text-blue-400 font-bold text-center md:text-left mb-4'>Le journal Nextblock</p>" } },
            { "block_type": "text", "content": { "html_content": "<h2 class='text-4xl md:text-5xl font-bold text-white text-center md:text-left mb-6'>Plongées dans la performance, l''expérience dev et l''édition visuelle.</h2>" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-lg max-w-xl mx-auto md:mx-0 text-center md:text-left text-slate-300 leading-relaxed'>Walkthroughs d''architecture, recettes Supabase et expérimentations éditeur écrits par l''équipe Nextblock.</p>" } },
            { "block_type": "button", "content": { "text": "Explorer les articles", "url": "/articles#latest", "variant": "default", "size": "lg" } },
            { "block_type": "button", "content": { "text": "S''abonner aux mises à jour", "url": "https://github.com/nextblock-cms/nextblock/discussions", "variant": "outline", "size": "lg" } }
          ],
          [
            { "block_type": "text", "content": { "html_content": "<div class='rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl p-4 backdrop-blur-sm'><img src='/images/developer.webp' alt='Développeur travaillant avec la stack Nextblock' class='w-full object-cover rounded-2xl shadow-lg' style='max-width: 400px;' /></div>" } }
          ]
        ]
      }$$::jsonb,
      0
    ),
    (
      v_blog_page_fr_id,
      v_fr_lang_id,
      'posts_grid',
      $${
        "postsPerPage": 6,
        "columns": 3,
        "showPagination": true,
        "title": "Derniers articles"
      }$$::jsonb,
      1
    );
    
  -- INSERT: Navigation Items
  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order", page_id)
  VALUES
    (v_en_lang_id, 'HEADER', 'Home', '/', 0, v_home_page_id),
    (v_en_lang_id, 'HEADER', 'Articles', '/articles', 1, v_blog_page_id),
    
    (v_fr_lang_id, 'HEADER', 'Accueil', '/accueil', 0, v_home_page_fr_id),
    (v_fr_lang_id, 'HEADER', 'Articles', '/articles', 1, v_blog_page_fr_id);

  -- INSERT: Sandbox Translations
  -- INSERT: Sandbox Translations
  -- Note: The table schema is (key, translations jsonb).
  -- We use ON CONFLICT DO UPDATE to ensure these keys exist even if seeded.
  INSERT INTO public.translations (key, translations) VALUES
  ('sandbox_mode_banner', '{"en": "Sandbox Mode: Data is public and resets every 15 minutes.", "fr": "Mode Sandbox : Les données sont publiques et réinitialisées toutes les 15 minutes."}'),
  ('demo_access_title', '{"en": "Demo Access", "fr": "Accès Démo"}'),
  ('demo_access_desc', '{"en": "This is a demo site. You may use the following credentials to access the admin section:", "fr": "Ceci est un site de démonstration. Vous pouvez utiliser les identifiants suivants pour accéder à l''administration :"}'),
  ('demo_user_label', '{"en": "User:", "fr": "Utilisateur :"}'),
  ('demo_password_label', '{"en": "Password:", "fr": "Mot de passe :"}')
  ON CONFLICT (key) DO UPDATE
  SET translations = EXCLUDED.translations;

  -- C. Reset Admin Role
  UPDATE public.profiles
  SET role = 'ADMIN'
  WHERE id = (SELECT id FROM auth.users WHERE email = 'demo@nextblock.ca');

END;
$function$;


-- 2. Security Triggers

-- Trigger A: Account Protection (demo@nextblock.ca)
CREATE OR REPLACE FUNCTION public.protect_demo_account()
RETURNS TRIGGER AS $trigger$
BEGIN
  -- Prevent deletion of the demo account
  IF TG_OP = 'DELETE' AND OLD.email = 'demo@nextblock.ca' THEN
    RAISE EXCEPTION 'Deletion of the demo account is restricted in Sandbox Mode.';
  END IF;

  -- Prevent modification of critical fields (email, password)
  IF TG_OP = 'UPDATE' AND OLD.email = 'demo@nextblock.ca' THEN
    IF NEW.email != OLD.email OR NEW.encrypted_password != OLD.encrypted_password THEN
      RAISE EXCEPTION 'Modification of demo account credentials is restricted in Sandbox Mode.';
    END IF;
  END IF;

  RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_demo_account ON auth.users;
CREATE TRIGGER trigger_protect_demo_account
BEFORE UPDATE OR DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_demo_account();


-- Trigger B: Content Protection (Critical Pages)
CREATE OR REPLACE FUNCTION public.protect_critical_pages()
RETURNS TRIGGER AS $trigger$
BEGIN
  IF OLD.slug IN ('home', 'blog', 'articles', 'accueil') THEN
      RAISE EXCEPTION 'Critical pages cannot be deleted or modified in Sandbox Mode.';
  END IF;
  RETURN OLD;
END;
$trigger$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_critical_pages ON public.pages;
CREATE TRIGGER trigger_protect_critical_pages
BEFORE DELETE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.protect_critical_pages();

CREATE OR REPLACE FUNCTION public.protect_critical_pages_update()
RETURNS TRIGGER AS $trigger$
BEGIN
  IF OLD.slug IN ('home', 'blog', 'articles', 'accueil') AND (NEW.slug != OLD.slug OR NEW.status != 'published') THEN
       RAISE EXCEPTION 'Critical pages cannot be renamed or unpublished in Sandbox Mode.';
  END IF;
  RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_critical_pages_update ON public.pages;
CREATE TRIGGER trigger_protect_critical_pages_update
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.protect_critical_pages_update();
