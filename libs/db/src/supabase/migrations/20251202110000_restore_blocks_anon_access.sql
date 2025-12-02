BEGIN;

-- Restore the policy that allows anonymous users to read blocks of published content
-- This was accidentally removed in a previous cleanup.

CREATE POLICY "blocks_anon_can_read_published_blocks" ON public.blocks
  FOR SELECT
  TO anon
  USING (
    (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
    (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
  );

COMMENT ON POLICY "blocks_anon_can_read_published_blocks" ON public.blocks IS 'Anonymous users can read blocks of published parent content.';

COMMIT;
