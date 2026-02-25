
-- Fix remaining loading-sheets policies (some already existed)
DROP POLICY IF EXISTS "Users can update own loading sheets" ON storage.objects;
CREATE POLICY "Users can update own loading sheets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'loading-sheets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own loading sheets" ON storage.objects;
CREATE POLICY "Users can delete own loading sheets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'loading-sheets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete all loading sheets" ON storage.objects;
CREATE POLICY "Admins can delete all loading sheets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'loading-sheets' AND public.has_role(auth.uid(), 'admin'));
