-- Drop the existing restrictive policy for updates
DROP POLICY IF EXISTS "Allow all access to ADMIN" ON public.translations;

-- Create a more permissive policy that allows authenticated users to update translations
-- This assumes that access to the CMS is already controlled at the application level
CREATE POLICY "Allow authenticated users to manage translations"
ON public.translations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);