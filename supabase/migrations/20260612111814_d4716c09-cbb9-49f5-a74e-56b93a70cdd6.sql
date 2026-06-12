
-- 1) New server-only credentials table
CREATE TABLE IF NOT EXISTS public.arion_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  arion_login text,
  arion_password text,
  arion_station text NOT NULL DEFAULT 'MAD',
  arion_last_sync timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Grants: ONLY service_role. No anon/authenticated access.
REVOKE ALL ON public.arion_credentials FROM PUBLIC;
REVOKE ALL ON public.arion_credentials FROM anon;
REVOKE ALL ON public.arion_credentials FROM authenticated;
GRANT ALL ON public.arion_credentials TO service_role;

-- 3) RLS enabled with no policies = default deny for anon/authenticated.
ALTER TABLE public.arion_credentials ENABLE ROW LEVEL SECURITY;

-- 4) updated_at trigger
CREATE TRIGGER update_arion_credentials_updated_at
BEFORE UPDATE ON public.arion_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Migrate existing data from profiles (where any field is set)
INSERT INTO public.arion_credentials (user_id, arion_login, arion_password, arion_station, arion_last_sync)
SELECT user_id,
       arion_login,
       arion_password,
       COALESCE(arion_station, 'MAD'),
       arion_last_sync
FROM public.profiles
WHERE arion_login IS NOT NULL
   OR arion_password IS NOT NULL
   OR arion_last_sync IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 6) Drop the now-unsafe columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS arion_login;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS arion_password;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS arion_station;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS arion_last_sync;
