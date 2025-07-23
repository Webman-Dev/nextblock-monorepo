-- Fix multiple permissive policies on logos table
DROP POLICY IF EXISTS "Allow admin users to manage logos" ON public.logos;
DROP POLICY IF EXISTS "Allow read access for authenticated users on logos" ON public.logos;

CREATE POLICY "Allow read access for authenticated users on logos"
ON public.logos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin users to insert logos"
ON public.logos
FOR INSERT TO authenticated
WITH CHECK ((get_my_claim('user_role'::text) = '"admin"'::jsonb));

CREATE POLICY "Allow admin users to update logos"
ON public.logos
FOR UPDATE TO authenticated
USING ((get_my_claim('user_role'::text) = '"admin"'::jsonb))
WITH CHECK ((get_my_claim('user_role'::text) = '"admin"'::jsonb));

CREATE POLICY "Allow admin users to delete logos"
ON public.logos
FOR DELETE TO authenticated
USING ((get_my_claim('user_role'::text) = '"admin"'::jsonb));

-- Fix mutable search path for get_my_claim
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)
RETURNS JSONB AS $$
  SET search_path = '';
  SELECT COALESCE(current_setting('request.jwt.claims', true)::JSONB ->> claim, NULL)::JSONB
$$ LANGUAGE SQL STABLE;

-- Optimize RLS policies on blocks table
DROP POLICY IF EXISTS "blocks_are_readable_if_parent_is_published" ON public.blocks;
DROP POLICY IF EXISTS "admins_and_writers_can_manage_blocks" ON public.blocks;

CREATE POLICY "blocks_are_readable_if_parent_is_published"
ON public.blocks FOR SELECT
TO anon, authenticated
USING (
  (page_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.pages p
    WHERE p.id = blocks.page_id AND p.status = 'published'
  )) OR
  (post_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.posts pt
    WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())
  ))
);

CREATE POLICY "admins_and_writers_can_manage_blocks"
ON public.blocks FOR ALL
TO authenticated
USING ((SELECT get_my_claim('user_role'::text)) IN ('"admin"', '"writer"'))
WITH CHECK ((SELECT get_my_claim('user_role'::text)) IN ('"admin"', '"writer"'));