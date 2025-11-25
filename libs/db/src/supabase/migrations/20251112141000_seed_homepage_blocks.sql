-- supabase/migrations/20251112141000_seed_homepage_blocks.sql
-- Populates the English Home page with structured blocks sourced from the landing page brief.

DO $seed$
DECLARE
  v_en_lang_id BIGINT;
  v_home_page_id BIGINT;
  v_blog_page_id BIGINT;
BEGIN
  SELECT id INTO v_en_lang_id
  FROM public.languages
  WHERE code = 'en'
  LIMIT 1;

  IF v_en_lang_id IS NULL THEN
    RAISE EXCEPTION 'English language (code = en) not found. Run the language seed migration first.';
  END IF;

  SELECT id INTO v_home_page_id
  FROM public.pages
  WHERE slug = 'home'
    AND language_id = v_en_lang_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_home_page_id IS NULL THEN
    RAISE EXCEPTION 'Published English Home page not found. Run the page/post seed migration first.';
  END IF;

  SELECT id INTO v_blog_page_id
  FROM public.pages
  WHERE slug = 'articles'
    AND language_id = v_en_lang_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_blog_page_id IS NULL THEN
    RAISE EXCEPTION 'Published English Articles page not found. Run the page/post seed migration first.';
  END IF;

  DELETE FROM public.blocks
  WHERE page_id = v_home_page_id;

  DELETE FROM public.blocks
  WHERE page_id = v_blog_page_id;

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
              { "color": "#111827", "position": 0 },
              { "color": "#1f2937", "position": 45 },
              { "color": "#0f172a", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 2 },
        "column_gap": "xl",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<h1 class='text-4xl md:text-5xl font-semibold tracking-tight text-white text-center'>Build Blazing-Fast, Modern Websites. Visually.</h1>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-xl text-muted-foreground text-center max-w-3xl mx-auto'>NextBlock is the open-source, developer-first Next.js CMS that merges 100% Lighthouse scores with a powerful visual block editor.</p>"
              }
            },
            {
              "block_type": "button",
              "content": {
                "text": "Get Started",
                "url": "/docs/get-started",
                "variant": "default",
                "size": "lg"
              }
            },
            {
              "block_type": "button",
              "content": {
                "text": "View on GitHub",
                "url": "https://github.com/Webman-Dev/nextblock-monorepo",
                "variant": "outline",
                "size": "lg"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='flex flex-wrap justify-center gap-6 text-sm uppercase tracking-wide text-muted-foreground mt-6'><a href='https://github.com/Webman-Dev' target='_blank' rel='noopener noreferrer'>GitHub</a><a href='https://x.com/NextBlockCMS' target='_blank' rel='noopener noreferrer'>X</a><a href='https://www.linkedin.com/in/nextblock/' target='_blank' rel='noopener noreferrer'>LinkedIn</a><a href='https://dev.to/nextblockcms' target='_blank' rel='noopener noreferrer'>Dev.to</a><a href='https://www.npmjs.com/~nextblockcms' target='_blank' rel='noopener noreferrer'>npm</a></div>"
              }
            }
          ],
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='p-6 border border-white/30 rounded-3xl bg-slate-900/70 backdrop-blur space-y-4 text-white shadow-2xl'><div><p class='text-xs text-white/70 uppercase tracking-wide'>Why teams switch</p><p class='text-2xl font-semibold mt-2'>100% Lighthouse</p><p class='text-sm text-white/80'>Edge-rendered marketing sites, launches, and docs with uncompromising performance.</p></div><ul class='space-y-2 text-sm text-white/80'><li>Next.js 16 with ISR and edge caching</li><li>Supabase auth, data, and storage</li><li>Notion-style block editor powered by Tiptap</li></ul><div class='rounded-3xl overflow-hidden border border-white/20'><img src='/images/NBcover.webp' alt='Nextblock cover showcasing dashboards and blocks' class='w-full h-auto object-cover' /></div></div>"
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
                "html_content": "<p class='text-lg text-muted-foreground text-center max-w-3xl mx-auto'>NextBlock is a holistic platform that unites performance, editorial experience, and developer control so every stakeholder delivers their best work.</p>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='grid gap-6 md:grid-cols-3 mt-10'><div class='p-6 rounded-2xl border border-white/10 bg-white/5'><h3 class='text-xl font-semibold mb-3'>Built for Speed. Obsessed with Performance.</h3><p class='text-sm text-muted-foreground'>Architected for 100% Lighthouse scores with global delivery and near-instant FCP.</p><ul class='mt-4 space-y-2 text-sm text-muted-foreground'><li><strong>Edge Caching & ISR:</strong> Serve pages worldwide with stale-while-revalidate.</li><li><strong>Critical CSS Inlining:</strong> Inline above-the-fold styles to eliminate render blocking.</li><li><strong>Advanced Image Optimization:</strong> AVIF output and blurred placeholders for instant paint.</li><li><strong>Intelligent Script Loading:</strong> Defer non-critical scripts to keep TTI silky smooth.</li></ul></div><div class='p-6 rounded-2xl border border-white/10 bg-white/[0.04]'><h3 class='text-xl font-semibold mb-3'>An Editing Experience Creators Will Love.</h3><p class='text-sm text-muted-foreground'>A low-code, Notion-style block editor empowers teams to ship pages without engineering help.</p><ul class='mt-4 space-y-2 text-sm text-muted-foreground'><li><strong>Notion-Style Editor:</strong> Slash commands, inline widgets, and drag-and-drop layouts.</li><li><strong>Seamless Bilingual Support:</strong> Manage every locale from a single interface.</li><li><strong>Content Revision History:</strong> Restore any previous version with a click.</li><li><strong>Organized Media Library:</strong> Folders, tags, and bulk actions keep assets tidy.</li></ul></div><div class='p-6 rounded-2xl border border-white/15 bg-gradient-to-br from-violet-600/20 to-blue-500/20'><h3 class='text-xl font-semibold mb-3'>Your Stack, Your Rules. Infinitely Extensible.</h3><p class='text-sm text-muted-foreground'>Open-source control with a clean Nx monorepo and a typed SDK for limitless customization.</p><ul class='mt-4 space-y-2 text-sm text-muted-foreground'><li><strong>Open Source & Self-Hosted:</strong> Own the code, the infra, and the data forever.</li><li><strong>Nx Monorepo Architecture:</strong> Share code, manage dependencies, and scale confidently.</li><li><strong>Developer SDK & CLI:</strong> Scaffold blocks, themes, and projects in minutes.</li><li><strong>Themable & Composable:</strong> Tailwind + shadcn/ui foundations for deep theming.</li></ul></div></div>"
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
            "direction": "160deg",
            "stops": [
              { "color": "hsl(var(--primary))", "position": 0 },
              { "color": "hsl(var(--primary) / 0.35)", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            {
              "block_type": "heading",
              "content": {
                "level": 2,
                "text_content": "Built with the Best.",
                "textAlign": "center"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-white/80 text-center max-w-2xl mx-auto'>Every layer of NextBlock leans on proven developer-first technology so the platform feels familiar, performant, and trustworthy from day one.</p><div class='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-8 text-sm font-semibold text-center text-white'><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Next.js</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>React</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Supabase</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Tailwind CSS</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>shadcn/ui</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Tiptap</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Vercel</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Nx</div></div>"
              }
            },
            {
              "block_type": "heading",
              "content": {
                "level": 2,
                "text_content": "Powerful for Developers. Intuitive for Editors.",
                "textAlign": "center"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='grid md:grid-cols-2 gap-6 mt-8 text-white'><div class='p-6 rounded-2xl border border-white/20 bg-white/5'><h3 class='text-lg font-semibold mb-4'>For Content Creators & Editors</h3><ul class='space-y-3 text-sm text-white/80'><li><strong>Intuitive Block Editor:</strong> Drag-and-drop layouts with a Notion-like interface.</li><li><strong>Rich Content Blocks:</strong> Deploy heroes, galleries, testimonials, and more in one click.</li><li><strong>Effortless Media Management:</strong> Organize assets with folders, tags, and bulk actions.</li><li><strong>Worry-Free Revisions:</strong> Automatic version history with instant restore.</li><li><strong>Built-in Bilingual Support:</strong> Publish multi-language content from a single workspace.</li><li><strong>Real-time Collaboration Prep:</strong> Presence indicators and content locks prevent collisions.</li></ul></div><div class='p-6 rounded-2xl border border-white/25 bg-gradient-to-br from-white/10 to-white/5'><h3 class='text-lg font-semibold mb-4'>For Developers & Agencies</h3><ul class='space-y-3 text-sm text-white/80'><li><strong>Next.js 16 Core:</strong> Server Components, ISR, and Edge Functions ready out of the box.</li><li><strong>Supabase Integration:</strong> Postgres, auth, storage, and real-time APIs without glue code.</li><li><strong>Monorepo Ready:</strong> Nx-powered dev experience for scalable architectures.</li><li><strong>Extensible Block SDK:</strong> Ship fully typed custom blocks and widgets.</li><li><strong>Powerful CLI:</strong> Scaffold projects, modules, and admin flows from the terminal.</li><li><strong>Full Self-Hosting Control:</strong> Deploy anywhere for complete ownership.</li></ul></div></div>"
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
                "html_content": "<p class='text-muted-foreground text-center max-w-3xl mx-auto'>NextBlock is building a sustainable open-core roadmap so the platform grows with your business.</p>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='grid md:grid-cols-2 gap-6 mt-10'><div class='p-6 rounded-2xl border border-white/10 bg-white/5'><p class='text-xs uppercase tracking-wide text-muted-foreground mb-2'>Coming Soon</p><h3 class='text-xl font-semibold mb-2'>NextBlock Commerce</h3><p class='text-sm text-muted-foreground'>Transform your site into a composable storefront. The premium module ships product management, seamless Stripe payments, and e-commerce blocks that drop directly into the editor.</p></div><div class='p-6 rounded-2xl border border-white/10 bg-white/5'><p class='text-xs uppercase tracking-wide text-muted-foreground mb-2'>Build the Future</p><h3 class='text-xl font-semibold mb-2'>Plugin & Block Marketplace</h3><p class='text-sm text-muted-foreground'>A community-driven marketplace invites developers to publish and monetize custom blocks, themes, and plugins—turning NextBlock into an extensible ecosystem.</p></div></div>"
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
                "html_content": "<p class='text-muted-foreground text-center max-w-3xl mx-auto'>NextBlock is being built in the open. Star the repo, share feedback, and help define the future of performance-first content management.</p>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='grid gap-4 md:grid-cols-3 mt-8 text-sm'><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://github.com/Webman-Dev' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>GitHub</strong><span class='text-muted-foreground'>Star the repo & contribute</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://x.com/NextBlockCMS' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>X (Twitter)</strong><span class='text-muted-foreground'>Follow updates & announcements</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://dev.to/nextblockcms' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>Dev.to</strong><span class='text-muted-foreground'>Read technical deep dives</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://www.linkedin.com/in/nextblock/' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>LinkedIn</strong><span class='text-muted-foreground'>Connect with the project</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://www.npmjs.com/~nextblockcms' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>npm</strong><span class='text-muted-foreground'>View published packages</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://github.com/Webman-Dev/nextblock-monorepo/discussions' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>Discussions</strong><span class='text-muted-foreground'>Join the GitHub discussions</span></a></div>"
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
            "direction": "120deg",
            "stops": [
              { "color": "hsl(var(--primary))", "position": 0 },
              { "color": "hsl(var(--primary) / 0.4)", "position": 100 }
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
                "html_content": "<h2 class='text-3xl md:text-4xl font-semibold text-center text-[hsl(var(--accent-foreground))]'>Have Questions or Want to Collaborate?</h2>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-center text-base text-[hsla(var(--accent-foreground),0.8)] max-w-2xl mx-auto'>NextBlock partners with early adopters to co-build features, sponsor modules, and shape the product direction.</p>"
              }
            },
            {
              "block_type": "button",
              "content": {
                "text": "Get in Touch",
                "url": "mailto:hello@nextblockcms.com",
                "variant": "default",
                "size": "lg"
              }
            }
          ]
        ]
      }$$::jsonb,
      4
    );

  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
  VALUES
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
            "direction": "120deg",
            "stops": [
              { "color": "#0f172a", "position": 0 },
              { "color": "#1d2a44", "position": 100 }
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
                "html_content": "<p class='text-sm uppercase tracking-[0.3em] text-primary/70 text-center md:text-left'>The Nextblock Journal</p>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<h2 class='text-3xl md:text-4xl font-semibold text-white text-center md:text-left'>Deep dives into performance, DX, and visual editing.</h2>"
              }
            },
            {
              "block_type": "text",
              "content": {
                "html_content": "<p class='text-muted-foreground text-lg max-w-xl mx-auto md:mx-0 text-center md:text-left'>Explore architectural walkthroughs, Supabase recipes, and block editor experiments written by the Nextblock core team.</p>"
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
                "url": "https://github.com/Webman-Dev/nextblock-monorepo/discussions",
                "variant": "outline",
                "size": "lg"
              }
            }
          ],
          [
            {
              "block_type": "text",
              "content": {
                "html_content": "<div class='h-full flex items-center justify-center rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl p-2'><img src='/images/developer.webp' alt='Developer working with the Nextblock stack' class='w-full object-cover rounded-2xl' style='max-width: 350px;' /></div>"
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
    );

  DELETE FROM public.navigation_items
  WHERE menu_key = 'HEADER'
    AND language_id = v_en_lang_id;

  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order", page_id)
  VALUES
    (v_en_lang_id, 'HEADER', 'Home', '/', 0, v_home_page_id),
    (v_en_lang_id, 'HEADER', 'Articles', '/articles', 1, v_blog_page_id);
END;
$seed$;

SELECT id AS home_page_id
FROM public.pages
WHERE slug = 'home'
  AND language_id = (SELECT id FROM public.languages WHERE code = 'en' LIMIT 1)
ORDER BY created_at DESC
LIMIT 1;

SELECT id AS blog_page_id
FROM public.pages
WHERE slug = 'articles'
  AND language_id = (SELECT id FROM public.languages WHERE code = 'en' LIMIT 1)
ORDER BY created_at DESC
LIMIT 1;

-- Seed French blocks for Accueil and Articles
DO $seed_fr$
DECLARE
  v_fr_lang_id BIGINT;
  v_home_page_fr_id BIGINT;
  v_blog_page_fr_id BIGINT;
BEGIN
  SELECT id INTO v_fr_lang_id FROM public.languages WHERE code = 'fr' LIMIT 1;
  IF v_fr_lang_id IS NULL THEN
    RAISE EXCEPTION 'French language (code = fr) not found. Run the language seed migration first.';
  END IF;

  SELECT id INTO v_home_page_fr_id FROM public.pages WHERE slug = 'accueil' AND language_id = v_fr_lang_id ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_blog_page_fr_id FROM public.pages WHERE slug = 'articles' AND language_id = v_fr_lang_id ORDER BY created_at DESC LIMIT 1;

  IF v_home_page_fr_id IS NULL THEN
    RAISE EXCEPTION 'French home page not found.';
  END IF;
  IF v_blog_page_fr_id IS NULL THEN
    RAISE EXCEPTION 'French articles page not found.';
  END IF;

  DELETE FROM public.blocks WHERE page_id IN (v_home_page_fr_id, v_blog_page_fr_id);

  DELETE FROM public.navigation_items
  WHERE menu_key = 'HEADER'
    AND language_id = v_fr_lang_id;

  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order", page_id)
  VALUES
    (v_fr_lang_id, 'HEADER', 'Accueil', '/accueil', 0, v_home_page_fr_id),
    (v_fr_lang_id, 'HEADER', 'Articles', '/articles', 1, v_blog_page_fr_id);

  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
  VALUES
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
              { "color": "#111827", "position": 0 },
              { "color": "#1f2937", "position": 45 },
              { "color": "#0f172a", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 2 },
        "column_gap": "xl",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            { "block_type": "text", "content": { "html_content": "<h1 class='text-4xl md:text-5xl font-semibold tracking-tight text-white text-center'>Créez des sites modernes ultra-rapides. Visuellement.</h1>" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-xl text-muted-foreground text-center max-w-3xl mx-auto'>NextBlock est un CMS Next.js open-source et orienté développeurs, alliant scores Lighthouse parfaits et éditeur visuel puissant.</p>" } },
            { "block_type": "button", "content": { "text": "Commencer", "url": "/docs/get-started", "variant": "default", "size": "lg" } },
            { "block_type": "button", "content": { "text": "Voir sur GitHub", "url": "https://github.com/Webman-Dev/nextblock-monorepo", "variant": "outline", "size": "lg" } },
            { "block_type": "text", "content": { "html_content": "<div class='flex flex-wrap justify-center gap-6 text-sm uppercase tracking-wide text-muted-foreground mt-6'><a href='https://github.com/Webman-Dev' target='_blank' rel='noopener noreferrer'>GitHub</a><a href='https://x.com/NextBlockCMS' target='_blank' rel='noopener noreferrer'>X</a><a href='https://www.linkedin.com/in/nextblock/' target='_blank' rel='noopener noreferrer'>LinkedIn</a><a href='https://dev.to/nextblockcms' target='_blank' rel='noopener noreferrer'>Dev.to</a><a href='https://www.npmjs.com/~nextblockcms' target='_blank' rel='noopener noreferrer'>npm</a></div>" } }
          ],
          [
            { "block_type": "text", "content": { "html_content": "<div class='p-6 border border-white/30 rounded-3xl bg-slate-900/70 backdrop-blur space-y-4 text-white shadow-2xl'><div><p class='text-xs text-white/70 uppercase tracking-wide'>Pourquoi migrer</p><p class='text-2xl font-semibold mt-2'>100% Lighthouse</p><p class='text-sm text-white/80'>Sites marketing et docs rendus à l'edge avec des performances irréprochables.</p></div><ul class='space-y-2 text-sm text-white/80'><li>Next.js 16 avec ISR et cache edge</li><li>Supabase pour l'auth, les données et le stockage</li><li>Éditeur de blocs type Notion sur Tiptap</li></ul><div class='rounded-3xl overflow-hidden border border-white/20'><img src='/images/NBcover.webp' alt='Couverture Nextblock avec tableaux de bord et blocs' class='w-full h-auto object-cover' /></div></div>" } }
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
            { "block_type": "text", "content": { "html_content": "<p class='text-lg text-muted-foreground text-center max-w-3xl mx-auto'>NextBlock unifie performances, expérience éditoriale et contrôle développeur pour que chaque équipe livre son meilleur travail.</p>" } },
            { "block_type": "text", "content": { "html_content": "<div class='grid gap-6 md:grid-cols-3 mt-10'><div class='p-6 rounded-2xl border border-white/10 bg-white/5'><h3 class='text-xl font-semibold mb-3'>Conçu pour la vitesse. Obsédé par la performance.</h3><p class='text-sm text-muted-foreground'>Pensé pour des scores Lighthouse parfaits avec une diffusion mondiale et un FCP quasi instantané.</p><ul class='mt-4 space-y-2 text-sm text-muted-foreground'><li><strong>Edge Caching & ISR :</strong> servez vos pages partout avec stale-while-revalidate.</li><li><strong>Critical CSS :</strong> styles above-the-fold en ligne pour éviter les blocages.</li><li><strong>Optimisation d'images avancée :</strong> AVIF et placeholders floutés pour un rendu immédiat.</li><li><strong>Chargement intelligent des scripts :</strong> différé pour garder un TTI fluide.</li></ul></div><div class='p-6 rounded-2xl border border-white/10 bg-white/[0.04]'><h3 class='text-xl font-semibold mb-3'>Une expérience d'édition que les créateurs adorent.</h3><p class='text-sm text-muted-foreground'>Un éditeur façon Notion pour publier sans dépendre des développeurs.</p><ul class='mt-4 space-y-2 text-sm text-muted-foreground'><li><strong>Modèles visuels :</strong> héros, galeries, témoignages prêts à l'emploi.</li><li><strong>Média simplifié :</strong> dossiers, tags et actions groupées.</li><li><strong>Restauration sans stress :</strong> historique complet pour retrouver la bonne version.</li><li><strong>Publication multilingue :</strong> gérez plusieurs langues depuis un seul espace.</li></ul></div><div class='p-6 rounded-2xl border border-white/10 bg-white/5'><h3 class='text-xl font-semibold mb-3'>Pensé pour les devs, prêt pour les équipes.</h3><p class='text-sm text-muted-foreground'>Un socle Next.js + Supabase modulaire, extensible et auto-hébergeable.</p><ul class='mt-4 space-y-2 text-sm text-muted-foreground'><li><strong>SDK de blocs :</strong> composants typés et extensibles.</li><li><strong>CLI prêt à l'emploi :</strong> générez modules et flux admin en minutes.</li><li><strong>Monorepo Nx :</strong> dépendances lisibles et maintenables.</li><li><strong>Liberté d'hébergement :</strong> gardez la maîtrise complète de vos données.</li></ul></div></div>" } }
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
            "direction": "160deg",
            "stops": [
              { "color": "hsl(var(--primary))", "position": 0 },
              { "color": "hsl(var(--primary) / 0.35)", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            { "block_type": "heading", "content": { "level": 2, "text_content": "Conçu avec les meilleurs outils.", "textAlign": "center" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-white/80 text-center max-w-2xl mx-auto'>Chaque couche de NextBlock repose sur des technologies éprouvées pour offrir une expérience familière, performante et fiable.</p><div class='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-8 text-sm font-semibold text-center text-white'><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Next.js</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>React</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Supabase</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Tailwind CSS</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>shadcn/ui</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Tiptap</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Vercel</div><div class='p-3 rounded-xl border border-white/30 bg-white/5'>Nx</div></div>" } },
            { "block_type": "heading", "content": { "level": 2, "text_content": "Puissant pour les développeurs. Intuitif pour les éditeurs.", "textAlign": "center" } },
            { "block_type": "text", "content": { "html_content": "<div class='grid md:grid-cols-2 gap-6 mt-8 text-white'><div class='p-6 rounded-2xl border border-white/20 bg-white/5'><h3 class='text-lg font-semibold mb-4'>Pour les créateurs de contenu</h3><ul class='space-y-3 text-sm text-white/80'><li><strong>Éditeur de blocs :</strong> glisser-déposer façon Notion.</li><li><strong>Blocs riches :</strong> héros, galeries, témoignages.</li><li><strong>Médiathèque :</strong> dossiers, tags et actions groupées.</li><li><strong>Versions sécurisées :</strong> historique et restauration instantanée.</li><li><strong>Support bilingue :</strong> gérez plusieurs langues depuis un seul espace.</li><li><strong>Collaboration prête :</strong> présences et verrous pour éviter les conflits.</li></ul></div><div class='p-6 rounded-2xl border border-white/25 bg-gradient-to-br from-white/10 to-white/5'><h3 class='text-lg font-semibold mb-4'>Pour développeurs et agences</h3><ul class='space-y-3 text-sm text-white/80'><li><strong>Next.js 16 :</strong> Server Components, ISR et Edge prêts à l'emploi.</li><li><strong>Supabase :</strong> Postgres, auth, stockage, temps réel.</li><li><strong>Monorepo Nx :</strong> dépendances lisibles et centrales.</li><li><strong>SDK de blocs :</strong> widgets typés et extensibles.</li><li><strong>CLI :</strong> générez modules et flux admin en minutes.</li><li><strong>Auto-hébergement :</strong> gardez la maîtrise de vos données.</li></ul></div></div>" } }
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
            { "block_type": "text", "content": { "html_content": "<p class='text-muted-foreground text-center max-w-3xl mx-auto'>NextBlock construit une feuille de route open-core durable qui évolue avec votre activité.</p>" } },
            { "block_type": "text", "content": { "html_content": "<div class='grid md:grid-cols-2 gap-6 mt-10'><div class='p-6 rounded-2xl border border-white/10 bg-white/5'><p class='text-xs uppercase tracking-wide text-muted-foreground mb-2'>Bientôt</p><h3 class='text-xl font-semibold mb-2'>NextBlock Commerce</h3><p class='text-sm text-muted-foreground'>Transformez votre site en vitrine composable. Module premium avec gestion produits, paiement Stripe et blocs e-commerce prêts à l'emploi.</p></div><div class='p-6 rounded-2xl border border-white/10 bg-white/5'><p class='text-xs uppercase tracking-wide text-muted-foreground mb-2'>Construisez le futur</p><h3 class='text-xl font-semibold mb-2'>Marketplace de plugins & blocs</h3><p class='text-sm text-muted-foreground'>Une marketplace communautaire pour publier et monétiser blocs, thèmes et plugins — pour un écosystème extensible.</p></div></div>" } },
            { "block_type": "heading", "content": { "level": 2, "text_content": "Rejoignez la communauté.", "textAlign": "center" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-muted-foreground text-center max-w-3xl mx-auto'>NextBlock se construit en public. Ajoutez une étoile, partagez vos retours et façonnez l'avenir du CMS orienté performance.</p>" } },
            { "block_type": "text", "content": { "html_content": "<div class='grid gap-4 md:grid-cols-3 mt-8 text-sm'><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://github.com/Webman-Dev' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>GitHub</strong><span class='text-muted-foreground'>Ajoutez une étoile & contribuez</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://x.com/NextBlockCMS' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>X (Twitter)</strong><span class='text-muted-foreground'>Suivez les annonces</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://dev.to/nextblockcms' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>Dev.to</strong><span class='text-muted-foreground'>Lisez nos articles techniques</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://www.linkedin.com/in/nextblock/' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>LinkedIn</strong><span class='text-muted-foreground'>Connectez-vous au projet</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://www.npmjs.com/~nextblockcms' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>npm</strong><span class='text-muted-foreground'>Consultez les packages publiés</span></a><a class='p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition' href='https://github.com/Webman-Dev/nextblock-monorepo/discussions' target='_blank' rel='noopener noreferrer'><strong class='block text-base'>Discussions</strong><span class='text-muted-foreground'>Rejoignez la discussion sur GitHub</span></a></div>" } }
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
            "direction": "120deg",
            "stops": [
              { "color": "hsl(var(--primary))", "position": 0 },
              { "color": "hsl(var(--primary) / 0.4)", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 1 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            { "block_type": "text", "content": { "html_content": "<h2 class='text-3xl md:text-4xl font-semibold text-center text-[hsl(var(--accent-foreground))]'>Des questions ou envie de collaborer ?</h2>" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-center text-base text-[hsla(var(--accent-foreground),0.8)] max-w-2xl mx-auto'>NextBlock co-construit avec des partenaires : fonctionnalités, modules sponsorisés et direction produit.</p>" } },
            { "block_type": "button", "content": { "text": "Nous contacter", "url": "mailto:hello@nextblockcms.com", "variant": "default", "size": "lg" } }
          ]
        ]
      }$$::jsonb,
      4
    );

  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
  VALUES
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
            "direction": "120deg",
            "stops": [
              { "color": "#0f172a", "position": 0 },
              { "color": "#1d2a44", "position": 100 }
            ]
          }
        },
        "responsive_columns": { "mobile": 1, "tablet": 1, "desktop": 2 },
        "column_gap": "lg",
        "padding": { "top": "xl", "bottom": "xl" },
        "column_blocks": [
          [
            { "block_type": "text", "content": { "html_content": "<p class='text-sm uppercase tracking-[0.3em] text-primary/70 text-center md:text-left'>Le journal Nextblock</p>" } },
            { "block_type": "text", "content": { "html_content": "<h2 class='text-3xl md:text-4xl font-semibold text-white text-center md:text-left'>Plongées dans la performance, l''expérience dev et l''édition visuelle.</h2>" } },
            { "block_type": "text", "content": { "html_content": "<p class='text-lg max-w-xl mx-auto md:mx-0 text-center md:text-left text-white'>Walkthroughs d''architecture, recettes Supabase et expérimentations éditeur écrits par l''équipe Nextblock.</p>" } },
            { "block_type": "button", "content": { "text": "Explorer les articles", "url": "/articles#latest", "variant": "default", "size": "lg" } },
            { "block_type": "button", "content": { "text": "S''abonner aux mises à jour", "url": "https://github.com/Webman-Dev/nextblock-monorepo/discussions", "variant": "outline", "size": "lg" } }
          ],
          [
            { "block_type": "text", "content": { "html_content": "<div class='rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl p-2'><img src='/images/developer.webp' alt='Développeur travaillant avec la stack Nextblock' class='w-full object-cover rounded-2xl' style='max-width: 350px;' /></div>" } }
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
END;
$seed_fr$;
