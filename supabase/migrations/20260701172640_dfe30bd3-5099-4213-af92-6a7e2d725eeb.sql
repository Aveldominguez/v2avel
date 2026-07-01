CREATE TABLE IF NOT EXISTS public.ac_load_sheet_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turnaround_id uuid REFERENCES public.turnarounds(id) ON DELETE CASCADE,
  flight_number text NOT NULL,
  flight_date date NOT NULL,
  aircraft_type text NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('arrival', 'departure')),
  section text NOT NULL CHECK (section IN ('FWD', 'AFT', 'BLK')),
  position text NOT NULL,
  container_id text,
  content_code text,
  weight_kg numeric,
  pieces integer,
  percentage integer,
  notes text,
  is_door_position boolean DEFAULT false,
  manual_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ac_load_sheet_data TO authenticated;
GRANT ALL ON public.ac_load_sheet_data TO service_role;

ALTER TABLE public.ac_load_sheet_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ac load sheet data"
  ON public.ac_load_sheet_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ac load sheet data"
  ON public.ac_load_sheet_data FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ac load sheet data"
  ON public.ac_load_sheet_data FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ac load sheet data"
  ON public.ac_load_sheet_data FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ac_load_sheet_flight
  ON public.ac_load_sheet_data (flight_number, flight_date, scan_type);

CREATE TRIGGER update_ac_load_sheet_updated_at
  BEFORE UPDATE ON public.ac_load_sheet_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
