CREATE POLICY "Allow public read access to logos"
ON public.logos
FOR SELECT
USING (true);