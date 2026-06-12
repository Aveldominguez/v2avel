
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND cmd='UPDATE'
      AND (qual ILIKE '%loading-sheets%' OR qual ILIKE '%turnaround-files%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Approved users can update their loading-sheets files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'loading-sheets'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_approved(auth.uid())
)
WITH CHECK (
  bucket_id = 'loading-sheets'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_approved(auth.uid())
);

CREATE POLICY "Approved users can update their turnaround-files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'turnaround-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_approved(auth.uid())
)
WITH CHECK (
  bucket_id = 'turnaround-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_approved(auth.uid())
);
