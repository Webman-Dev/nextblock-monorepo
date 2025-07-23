-- Re-enables RLS policies for storage.objects to allow authenticated uploads.

-- Adds a policy allowing authenticated users to upload files
CREATE POLICY "allow_authenticated_uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'public' AND owner = auth.uid());

-- Allow authenticated users to SELECT files
CREATE POLICY "allow_authenticated_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'public');

-- Allow authenticated users to UPDATE their own files
CREATE POLICY "allow_authenticated_updates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'public' AND owner = auth.uid());

-- Allow authenticated users to DELETE their own files
CREATE POLICY "allow_authenticated_deletes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'public' AND owner = auth.uid());