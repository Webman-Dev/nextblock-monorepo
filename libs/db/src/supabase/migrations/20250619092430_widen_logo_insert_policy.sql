DROP POLICY IF EXISTS "Allow admins to manage logos" ON public.logos;

CREATE POLICY "Allow admin and writer users to insert logos"
ON public.logos
FOR INSERT TO authenticated
WITH CHECK ((get_my_claim('user_role'::text) IN ('"admin"'::jsonb, '"writer"'::jsonb)));