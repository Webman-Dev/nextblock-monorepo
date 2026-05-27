-- 00000000000022_seed_cortex_ai_guide_post.sql
-- Adds the Cortex AI guide post linked from the seeded home page CTA.

BEGIN;

DO $$
DECLARE
  v_en_lang_id bigint;
  v_cortex_media_id uuid;
  v_cortex_post_id bigint;
BEGIN
  SELECT id INTO v_en_lang_id
  FROM public.languages
  WHERE code = 'en'
  LIMIT 1;

  IF v_en_lang_id IS NULL THEN
    RAISE EXCEPTION 'English language not found.';
  END IF;

  INSERT INTO public.media AS seed_media (
    file_name,
    object_key,
    file_path,
    file_type,
    size_bytes,
    width,
    height,
    folder,
    description
  )
  VALUES (
    'cortex-ai.webp',
    'images/cortex-ai.webp',
    'images/cortex-ai.webp',
    'image/webp',
    298588,
    1024,
    571,
    'images',
    'NextBlock Cortex AI editorial feature image'
  )
  ON CONFLICT (object_key) DO UPDATE
  SET
    file_name = COALESCE(seed_media.file_name, EXCLUDED.file_name),
    file_path = COALESCE(seed_media.file_path, EXCLUDED.file_path),
    file_type = COALESCE(seed_media.file_type, EXCLUDED.file_type),
    size_bytes = COALESCE(seed_media.size_bytes, EXCLUDED.size_bytes),
    width = COALESCE(seed_media.width, EXCLUDED.width),
    height = COALESCE(seed_media.height, EXCLUDED.height),
    folder = COALESCE(seed_media.folder, EXCLUDED.folder),
    description = COALESCE(seed_media.description, EXCLUDED.description),
    updated_at = now()
  RETURNING id INTO v_cortex_media_id;

  INSERT INTO public.posts (
    language_id,
    title,
    slug,
    label,
    status,
    excerpt,
    subtitle,
    published_at,
    meta_title,
    meta_description,
    translation_group_id,
    feature_image_id
  )
  VALUES (
    v_en_lang_id,
    'NextBlock Cortex AI Guide',
    'nextblock-cortex-ai-guide',
    'AI Copilot',
    'published',
    'A practical guide to Cortex AI, the block-aware assistant for model routing, BYOK controls, and faster editorial production inside NextBlock.',
    'See how Cortex AI brings structured generation, provider choice, and safer content workflows directly into the NextBlock editor.',
    now(),
    'NextBlock Cortex AI Guide',
    'Learn how NextBlock Cortex AI helps teams generate, refine, and translate structured block content with model routing and BYOK controls.',
    gen_random_uuid(),
    v_cortex_media_id
  )
  ON CONFLICT (language_id, slug) DO NOTHING
  RETURNING id INTO v_cortex_post_id;

  IF v_cortex_post_id IS NULL THEN
    SELECT id INTO v_cortex_post_id
    FROM public.posts
    WHERE language_id = v_en_lang_id
      AND slug = 'nextblock-cortex-ai-guide'
    LIMIT 1;

    UPDATE public.posts
    SET
      feature_image_id = v_cortex_media_id,
      updated_at = now()
    WHERE id = v_cortex_post_id
      AND feature_image_id IS NULL;
  END IF;

  IF v_cortex_post_id IS NULL THEN
    RAISE EXCEPTION 'Unable to create or find Cortex AI guide post.';
  END IF;

  INSERT INTO public.blocks (post_id, language_id, block_type, content, "order")
  SELECT
    v_cortex_post_id,
    v_en_lang_id,
    'text',
    jsonb_build_object('html_content', $cortex_ai_html$
<p class='text-lg leading-8 text-slate-700 dark:text-slate-300'>NextBlock Cortex AI is the AI layer built for the way NextBlock pages are actually composed. Instead of treating your site like a blank document, it understands blocks, sections, editor constraints, and the model choices your team wants to use.</p>

<div class='grid gap-4 md:grid-cols-3 my-10'>
  <div class='rounded-3xl border border-violet-200/70 bg-violet-50/80 p-6 dark:border-violet-500/20 dark:bg-violet-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200'>Model routing</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Pick the right model</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Route generation through OpenRouter or your configured provider strategy so each task can balance speed, quality, and cost.</p>
  </div>
  <div class='rounded-3xl border border-sky-200/70 bg-sky-50/80 p-6 dark:border-sky-500/20 dark:bg-sky-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200'>BYOK control</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Use your own keys</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Keep provider credentials under your control while still giving editors a clean, guided AI workflow in the CMS.</p>
  </div>
  <div class='rounded-3xl border border-emerald-200/70 bg-emerald-50/80 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10'>
    <p class='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200'>Typed output</p>
    <h3 class='mt-3 text-xl font-semibold text-slate-900 dark:text-white'>Generate valid blocks</h3>
    <p class='mt-3 text-sm text-slate-600 dark:text-slate-300'>Schema-aware generation helps AI output land as usable page structure instead of loose copy that needs a rebuild.</p>
  </div>
</div>

<h2>Why Cortex AI Belongs Inside the Editor</h2>
<p>Generic chat tools can draft copy, but they do not know the difference between a hero, a card grid, a product description, and a localized article. Cortex AI lives closer to the editing surface, so generation can respect the same block contracts that render on the public site.</p>
<p>That makes AI useful for practical production work: drafting a landing section, tightening an excerpt, expanding a product story, translating a post, or reshaping a rough idea into a block layout that already fits the system.</p>

<div class='rounded-[2rem] border border-slate-200/80 bg-slate-50/90 p-6 my-10 dark:border-white/10 dark:bg-slate-900/70'>
  <p class='text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200'>Editorial workflow</p>
  <div class='grid gap-5 md:grid-cols-2 mt-5'>
    <div class='rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950/50'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>Faster first drafts</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Start with a structured prompt and get a section, article outline, or product narrative that already matches the site voice.</p>
    </div>
    <div class='rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950/50'>
      <h3 class='mt-0 text-xl text-slate-900 dark:text-white'>Cleaner revisions</h3>
      <p class='text-sm text-slate-600 dark:text-slate-300'>Ask for shorter, clearer, more technical, more polished, or locale-ready output without leaving the content screen.</p>
    </div>
  </div>
</div>

<h2>Model Routing and Cost Control</h2>
<p>Cortex AI is designed around provider choice. Teams can route requests through the configured AI gateway, choose task-appropriate models, and keep bring-your-own-key setups separate from the editor experience. Editors get a simple control surface while developers keep the operational knobs.</p>
<ul>
  <li>Use fast, inexpensive models for drafts, variations, and rewrites</li>
  <li>Reserve stronger models for long-form strategy, technical copy, or difficult transformations</li>
  <li>Keep provider keys and routing defaults in the server-side configuration layer</li>
  <li>Make cost and quality decisions without changing the public rendering system</li>
</ul>

<h2>Block-Aware Generation</h2>
<p>The important shift is that Cortex AI is not just writing text. It is meant to produce content that can map back to NextBlock surfaces: section copy, article bodies, product descriptions, headings, calls to action, and localized variants. That reduces the cleanup step that usually happens after copying AI text from a separate tool.</p>
<p>Because the output is shaped around existing block contracts, the generated content feels native in the editor and predictable on the frontend.</p>

<h2>Safer Team Workflows</h2>
<p>AI works best when it is helpful without becoming invisible infrastructure. Cortex AI keeps humans in the loop: editors review the output, developers control the available providers, and the CMS keeps the generated content inside the same revision and publishing flow as everything else.</p>

<h2>A Practical Launch Flow</h2>
<ol>
  <li>Draft the article, landing section, or product story from a focused prompt.</li>
  <li>Refine the result against the brand voice and target audience.</li>
  <li>Generate a localized version or shorter excerpt for cards and metadata.</li>
  <li>Review the content in the NextBlock editor, publish, and keep iterating through normal revisions.</li>
</ol>

<p>Cortex AI turns the CMS into a more capable production surface: not a replacement for editorial judgment, but a faster way to shape good ideas into structured pages that are ready to ship.</p>
$cortex_ai_html$),
    0
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.blocks
    WHERE post_id = v_cortex_post_id
  );
END $$;

COMMIT;
