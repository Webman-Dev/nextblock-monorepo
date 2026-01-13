-- 00000000000041_seed_homepage_blocks.sql
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
END;
$seed_fr$;
