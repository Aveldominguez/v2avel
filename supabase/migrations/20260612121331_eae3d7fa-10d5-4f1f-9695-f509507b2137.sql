GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_module_access(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) TO anon, authenticated;