
-- 1. scheduled_flights: require approval
DROP POLICY IF EXISTS "Users can manage own scheduled flights" ON public.scheduled_flights;
CREATE POLICY "Users can manage own scheduled flights"
ON public.scheduled_flights
FOR ALL
TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

-- 2. storage delete policies: require approval
DROP POLICY IF EXISTS "Users can delete own loading sheets" ON storage.objects;
CREATE POLICY "Users can delete own loading sheets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'loading-sheets'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND public.is_approved(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own turnaround files" ON storage.objects;
CREATE POLICY "Users can delete own turnaround files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'turnaround-files'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND public.is_approved(auth.uid())
);

-- 3. user_roles: add explicit admin-only UPDATE policy to make intent deliberate
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. SECURITY DEFINER functions: revoke execute from public/anon. Trigger functions get no grants; helper functions used in RLS stay callable by authenticated only.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_prevent_privileged_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_module_access(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_module_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) TO authenticated;
