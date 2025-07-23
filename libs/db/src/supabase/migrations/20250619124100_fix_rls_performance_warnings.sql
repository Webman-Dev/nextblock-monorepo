BEGIN;

-- Drop existing policies for 'public.logos'
DROP POLICY IF EXISTS "Allow logo insert for authenticated users" ON public.logos;
DROP POLICY IF EXISTS "Allow logo update for authenticated users" ON public.logos;
DROP POLICY IF EXISTS "Allow logo delete for authenticated users" ON public.logos;

-- Recreate policies for 'public.logos' with optimized auth calls
CREATE POLICY "Allow logo insert for authenticated users"
ON public.logos
FOR INSERT
WITH CHECK ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Allow logo update for authenticated users"
ON public.logos
FOR UPDATE
USING ((SELECT auth.role()) = 'authenticated')
WITH CHECK ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Allow logo delete for authenticated users"
ON public.logos
FOR DELETE
USING ((SELECT auth.role()) = 'authenticated');

-- Drop existing policies for 'public.blocks'
DROP POLICY IF EXISTS "blocks_authenticated_comprehensive_select" ON public.blocks;
DROP POLICY IF EXISTS "blocks_admin_writer_can_insert" ON public.blocks;
DROP POLICY IF EXISTS "blocks_admin_writer_can_update" ON public.blocks;
DROP POLICY IF EXISTS "blocks_admin_writer_can_delete" ON public.blocks;
DROP POLICY IF EXISTS "blocks_anon_can_read_published_blocks" ON public.blocks;
DROP POLICY IF EXISTS "blocks_are_readable_if_parent_is_published" ON public.blocks;

-- Create a new comprehensive SELECT policy for 'public.blocks'
CREATE POLICY "Allow read access to blocks" ON public.blocks
FOR SELECT USING (
  (
    -- Anonymous users can read blocks of published content
    (SELECT auth.role()) = 'anon' AND
    (
      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
    )
  ) OR (
    -- Authenticated users have role-based access
    (SELECT auth.role()) = 'authenticated' AND
    (
      (
        -- ADMIN or WRITER can read all blocks
        EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER'))
      ) OR
      (
        -- USER can read blocks of published parents
        EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'USER') AND
        (
          (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR
          (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))
        )
      )
    )
  )
);

-- Re-create the management policies for 'public.blocks' with optimized auth calls
CREATE POLICY "Allow insert for admins and writers on blocks" ON public.blocks
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')));

CREATE POLICY "Allow update for admins and writers on blocks" ON public.blocks
FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')));

CREATE POLICY "Allow delete for admins and writers on blocks" ON public.blocks
FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')));

COMMIT;