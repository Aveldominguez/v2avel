DROP POLICY IF EXISTS "Users can upload loading sheets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own turnaround files" ON storage.objects;

CREATE POLICY "Users can upload loading sheets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'loading-sheets'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_approved(auth.uid())
);

CREATE POLICY "Users can upload own turnaround files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'turnaround-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_approved(auth.uid())
);