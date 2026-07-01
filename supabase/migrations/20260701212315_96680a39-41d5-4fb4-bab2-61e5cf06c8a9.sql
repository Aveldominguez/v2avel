
-- Harden arion_config: ensure the plaintext password column is never readable via PostgREST.
-- Revoke all API-role privileges, then grant only what's needed, excluding SELECT on password.
REVOKE ALL ON TABLE public.arion_config FROM anon, authenticated, PUBLIC;

-- Authenticated admins can write (RLS still restricts to admin role) but SELECT is column-scoped, excluding password.
GRANT INSERT, UPDATE, DELETE ON TABLE public.arion_config TO authenticated;
GRANT SELECT (id, username, station_code, updated_at, updated_by) ON TABLE public.arion_config TO authenticated;

-- Service role (edge functions) retains full access.
GRANT ALL ON TABLE public.arion_config TO service_role;
