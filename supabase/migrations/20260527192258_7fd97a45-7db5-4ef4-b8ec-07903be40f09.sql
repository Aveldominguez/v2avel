
-- Trigger functions: no client should ever call these directly
REVOKE ALL ON FUNCTION public.auto_assign_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Helper functions used only by RLS policies / edge functions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_user(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- has_role is referenced inside RLS USING() expressions evaluated under the
-- caller's role, so authenticated must keep EXECUTE on it.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
