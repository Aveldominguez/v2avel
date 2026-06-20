CREATE TABLE IF NOT EXISTS public.arion_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.arion_config TO authenticated;
GRANT ALL ON public.arion_config TO service_role;

ALTER TABLE public.arion_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage arion config"
  ON public.arion_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE TRIGGER trg_arion_config_updated_at
  BEFORE UPDATE ON public.arion_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();