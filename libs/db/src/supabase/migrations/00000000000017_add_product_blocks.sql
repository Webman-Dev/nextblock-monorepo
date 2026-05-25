-- 00000000000017_add_product_blocks.sql
-- Migration to support modular block editor for product descriptions.

-- 1. Add product_id column to public.blocks
ALTER TABLE public.blocks
  ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

-- 2. Drop the old parent constraint on public.blocks
ALTER TABLE public.blocks
  DROP CONSTRAINT IF EXISTS check_exactly_one_parent;

-- 3. Add the updated parent constraint supporting product_id
ALTER TABLE public.blocks
  ADD CONSTRAINT check_exactly_one_parent CHECK (
    (page_id IS NOT NULL AND post_id IS NULL AND product_id IS NULL)
    OR (post_id IS NOT NULL AND page_id IS NULL AND product_id IS NULL)
    OR (product_id IS NOT NULL AND page_id IS NULL AND post_id IS NULL)
  );

-- 4. Add blocks column to product_drafts table
ALTER TABLE public.product_drafts
  ADD COLUMN IF NOT EXISTS blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 5. Add check constraint to ensure product_drafts.blocks is a JSON array
ALTER TABLE public.product_drafts
  DROP CONSTRAINT IF EXISTS product_drafts_blocks_array;

ALTER TABLE public.product_drafts
  ADD CONSTRAINT product_drafts_blocks_array CHECK (jsonb_typeof(blocks) = 'array');

-- 6. Migrate existing product description_json to blocks
INSERT INTO public.blocks (product_id, language_id, block_type, content, "order")
SELECT
  id as product_id,
  language_id,
  'text' as block_type,
  jsonb_build_object('html_content', COALESCE(description_json#>>'{}', '')) as content,
  0 as "order"
FROM public.products
WHERE description_json IS NOT NULL AND (description_json#>>'{}') <> ''
ON CONFLICT DO NOTHING;

-- 7. Recreate blocks_anon_read_policy
DROP POLICY IF EXISTS blocks_anon_read_policy ON public.blocks;
CREATE POLICY blocks_anon_read_policy
  ON public.blocks
  FOR SELECT
  TO anon
  USING (
    (
      page_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.pages AS p
        WHERE p.id = blocks.page_id
          AND p.status = 'published'
      )
    )
    OR (
      post_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.posts AS pt
        WHERE pt.id = blocks.post_id
          AND pt.status = 'published'
          AND (pt.published_at IS NULL OR pt.published_at <= now())
      )
    )
    OR (
      product_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.products AS pr
        WHERE pr.id = blocks.product_id
          AND pr.status = 'active'
      )
    )
  );

-- 8. Recreate blocks_read_policy
DROP POLICY IF EXISTS blocks_read_policy ON public.blocks;
CREATE POLICY blocks_read_policy
  ON public.blocks
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
    OR (
      (
        page_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.pages AS p
          WHERE p.id = blocks.page_id
            AND p.status = 'published'
        )
      )
      OR (
        post_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.posts AS pt
          WHERE pt.id = blocks.post_id
            AND pt.status = 'published'
            AND (pt.published_at IS NULL OR pt.published_at <= now())
        )
      )
      OR (
        product_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.products AS pr
          WHERE pr.id = blocks.product_id
            AND pr.status = 'active'
        )
      )
    )
  );
