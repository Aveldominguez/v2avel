
-- Create storage bucket for loading sheets
INSERT INTO storage.buckets (id, name, public) VALUES ('loading-sheets', 'loading-sheets', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload loading sheets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'loading-sheets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view own loading sheets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'loading-sheets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own loading sheets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'loading-sheets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own loading sheets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'loading-sheets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can view all loading sheets
CREATE POLICY "Admins can view all loading sheets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'loading-sheets' AND public.has_role(auth.uid(), 'admin'));
