ALTER TABLE public.flight_cpm_data ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.flight_cpm_data FROM anon;
GRANT SELECT ON public.flight_cpm_data TO authenticated;
GRANT ALL ON public.flight_cpm_data TO service_role;

CREATE POLICY "Approved users can read CPM data"
  ON public.flight_cpm_data
  FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));