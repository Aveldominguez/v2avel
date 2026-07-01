-- Drop old table and recreate with new schema
DROP TABLE IF EXISTS public.ac_load_sheet_data CASCADE;

CREATE TABLE public.ac_load_sheet_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turnaround_id uuid REFERENCES public.turnarounds(id) ON DELETE CASCADE,
  flight_number text NOT NULL,
  flight_date date NOT NULL,
  aircraft_type text NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('arrival', 'departure')),
  fwd_section text NOT NULL CHECK (fwd_section IN ('FWD', 'AFT')),
  position text NOT NULL,
  container_id text,
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

CREATE POLICY "Approved users select ac_load_sheet_data"
  ON public.ac_load_sheet_data FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert ac_load_sheet_data"
  ON public.ac_load_sheet_data FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users update ac_load_sheet_data"
  ON public.ac_load_sheet_data FOR UPDATE
  TO authenticated
  USING (public.is_approved(auth.uid()))
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete ac_load_sheet_data"
  ON public.ac_load_sheet_data FOR DELETE
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE INDEX idx_ac_load_sheet_flight
  ON public.ac_load_sheet_data (flight_number, flight_date, scan_type);

CREATE TRIGGER update_ac_load_sheet_data_updated_at
  BEFORE UPDATE ON public.ac_load_sheet_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BULK data table
CREATE TABLE public.ac_bulk_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turnaround_id uuid REFERENCES public.turnarounds(id) ON DELETE CASCADE,
  flight_number text NOT NULL,
  flight_date date NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('arrival', 'departure')),
  bf integer NOT NULL DEFAULT 0,
  by_val integer NOT NULL DEFAULT 0,
  dom integer NOT NULL DEFAULT 0,
  usa integer NOT NULL DEFAULT 0,
  int_val integer NOT NULL DEFAULT 0,
  bg integer NOT NULL DEFAULT 0,
  rush integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flight_number, flight_date, scan_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ac_bulk_data TO authenticated;
GRANT ALL ON public.ac_bulk_data TO service_role;

ALTER TABLE public.ac_bulk_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users select ac_bulk_data"
  ON public.ac_bulk_data FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert ac_bulk_data"
  ON public.ac_bulk_data FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users update ac_bulk_data"
  ON public.ac_bulk_data FOR UPDATE
  TO authenticated
  USING (public.is_approved(auth.uid()))
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete ac_bulk_data"
  ON public.ac_bulk_data FOR DELETE
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE TRIGGER update_ac_bulk_data_updated_at
  BEFORE UPDATE ON public.ac_bulk_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();