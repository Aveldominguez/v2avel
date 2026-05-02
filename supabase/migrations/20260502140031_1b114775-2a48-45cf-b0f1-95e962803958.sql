-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('turnaround-files', 'loading-sheets');

-- Drop overly permissive turnaround-files policies
DROP POLICY IF EXISTS "Public can read turnaround files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload turnaround files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update turnaround files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete turnaround files" ON storage.objects;

-- Owner-scoped policies for turnaround-files (path layout: <user_id>/...)
CREATE POLICY "Users can view own turnaround files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'turnaround-files' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Admins can view all turnaround files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'turnaround-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can upload own turnaround files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'turnaround-files' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can update own turnaround files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'turnaround-files' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can delete own turnaround files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'turnaround-files' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Admins can delete all turnaround files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'turnaround-files' AND has_role(auth.uid(), 'admin'::app_role));

-- Prevent privilege escalation: users cannot change approved/blocked on own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND approved = (SELECT p.approved FROM public.profiles p WHERE p.user_id = auth.uid())
  AND blocked  = (SELECT p.blocked  FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Allow managed users to see who manages them (transparency)
CREATE POLICY "Users can view own managed relationships"
ON public.admin_managed_users FOR SELECT
TO authenticated
USING (managed_user_id = auth.uid());