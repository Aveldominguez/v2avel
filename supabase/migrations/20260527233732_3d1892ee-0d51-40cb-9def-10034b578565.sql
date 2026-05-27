
-- 1) Profiles: lock down immutable fields via trigger (defense in depth on top of RLS)
CREATE OR REPLACE FUNCTION public.profiles_prevent_privileged_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.user_id  := OLD.user_id;
  NEW.email    := OLD.email;
  NEW.approved := OLD.approved;
  NEW.blocked  := OLD.blocked;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_prevent_privileged_changes ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_privileged_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_prevent_privileged_changes();

REVOKE EXECUTE ON FUNCTION public.profiles_prevent_privileged_changes() FROM PUBLIC, anon;

-- 2) Tighten EXECUTE on SECURITY DEFINER helper functions: only authenticated callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_module_access(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_module_access(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) TO authenticated, service_role;

-- Trigger-only functions: no callers from the API surface
REVOKE EXECUTE ON FUNCTION public.auto_assign_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
