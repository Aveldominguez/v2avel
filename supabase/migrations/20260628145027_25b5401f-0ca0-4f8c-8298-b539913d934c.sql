
-- Restrict admin read access to ARION password column.
-- Admins can still view username/station and write (insert/update) credentials,
-- but the plaintext password is no longer readable via PostgREST.
REVOKE SELECT ON public.arion_config FROM authenticated;
GRANT SELECT (id, username, station_code, updated_at, updated_by)
  ON public.arion_config TO authenticated;

-- Split the catch-all policy so SELECT, INSERT, UPDATE, DELETE remain admin-only,
-- but the password column is excluded from SELECT via the column grants above.
DROP POLICY IF EXISTS "Only admins can manage arion config" ON public.arion_config;

CREATE POLICY "Admins can read arion config (no password)"
  ON public.arion_config FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert arion config"
  ON public.arion_config FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update arion config"
  ON public.arion_config FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete arion config"
  ON public.arion_config FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
