-- supabase/migrations/20251112142000_seed_how_it_works_post_blocks.sql
-- Populates the English "How NextBlock Works" post with a synthesized technical article.

WITH target_post AS (
  SELECT id, language_id
  FROM public.posts
  WHERE slug = 'how-nextblock-works'
    AND language_id = (SELECT id FROM public.languages WHERE code = 'en' LIMIT 1)
  ORDER BY created_at DESC
  LIMIT 1
),
purged AS (
  DELETE FROM public.blocks
  WHERE post_id IN (SELECT id FROM target_post)
)
INSERT INTO public.blocks (post_id, language_id, block_type, content, "order")
SELECT
  target_post.id,
  target_post.language_id,
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
<p>The stack highlighted in the project README—Next.js 15, Supabase, Tailwind CSS, and shadcn/ui—was selected to balance developer velocity with runtime performance. Next.js App Router unlocks Server Components, streaming, and incremental static regeneration so marketing experiences remain edge-fast. Supabase covers Postgres, Auth, and Storage, shrinking the operational footprint while still allowing custom SQL migrations. Tailwind plus shadcn/ui provide composable building blocks so the CMS interface, marketing site, and generated client projects all inherit the same visual language.</p>
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
FROM target_post;

SELECT id AS how_it_works_post_block_id, "order"
FROM public.blocks
WHERE post_id = (
  SELECT id FROM public.posts
  WHERE slug = 'how-nextblock-works'
    AND language_id = (SELECT id FROM public.languages WHERE code = 'en' LIMIT 1)
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY "order";
