
-- ============================================================
-- 1) catalog_airlines
-- ============================================================
CREATE TABLE public.catalog_airlines (
  code text PRIMARY KEY,
  name text NOT NULL,
  short_name text NOT NULL,
  color text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalog_airlines TO authenticated;
GRANT ALL ON public.catalog_airlines TO service_role;

ALTER TABLE public.catalog_airlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read airlines"
  ON public.catalog_airlines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert airlines"
  ON public.catalog_airlines FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update airlines"
  ON public.catalog_airlines FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete airlines"
  ON public.catalog_airlines FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_catalog_airlines_updated_at
  BEFORE UPDATE ON public.catalog_airlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) catalog_aircraft_models
-- ============================================================
CREATE TABLE public.catalog_aircraft_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_code text NOT NULL,
  model_code text NOT NULL,
  label text NOT NULL,
  turnaround_minutes integer NOT NULL DEFAULT 45,
  cleaning_minutes integer,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (airline_code, model_code)
);

CREATE INDEX idx_catalog_aircraft_models_airline ON public.catalog_aircraft_models(airline_code);

GRANT SELECT ON public.catalog_aircraft_models TO authenticated;
GRANT ALL ON public.catalog_aircraft_models TO service_role;

ALTER TABLE public.catalog_aircraft_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read aircraft models"
  ON public.catalog_aircraft_models FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert aircraft models"
  ON public.catalog_aircraft_models FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update aircraft models"
  ON public.catalog_aircraft_models FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete aircraft models"
  ON public.catalog_aircraft_models FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_catalog_aircraft_models_updated_at
  BEFORE UPDATE ON public.catalog_aircraft_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) catalog_compartments
-- ============================================================
CREATE TABLE public.catalog_compartments (
  id text PRIMARY KEY,
  airline_code text NOT NULL,
  aircraft_model_code text,
  name text NOT NULL,
  hold_style text NOT NULL DEFAULT 'default',
  bulk boolean NOT NULL DEFAULT false,
  expandable boolean NOT NULL DEFAULT false,
  expandable_default integer,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_compartments_airline_model
  ON public.catalog_compartments(airline_code, aircraft_model_code);

GRANT SELECT ON public.catalog_compartments TO authenticated;
GRANT ALL ON public.catalog_compartments TO service_role;

ALTER TABLE public.catalog_compartments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read compartments"
  ON public.catalog_compartments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert compartments"
  ON public.catalog_compartments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update compartments"
  ON public.catalog_compartments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete compartments"
  ON public.catalog_compartments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_catalog_compartments_updated_at
  BEFORE UPDATE ON public.catalog_compartments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4) catalog_holds
-- ============================================================
CREATE TABLE public.catalog_holds (
  id text PRIMARY KEY,
  compartment_id text NOT NULL REFERENCES public.catalog_compartments(id) ON DELETE CASCADE,
  label text NOT NULL,
  pair_group text,
  pair_side text CHECK (pair_side IN ('left','right') OR pair_side IS NULL),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_holds_compartment ON public.catalog_holds(compartment_id);

GRANT SELECT ON public.catalog_holds TO authenticated;
GRANT ALL ON public.catalog_holds TO service_role;

ALTER TABLE public.catalog_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read holds"
  ON public.catalog_holds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert holds"
  ON public.catalog_holds FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update holds"
  ON public.catalog_holds FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete holds"
  ON public.catalog_holds FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_catalog_holds_updated_at
  BEFORE UPDATE ON public.catalog_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5) catalog_load_codes
-- ============================================================
CREATE TABLE public.catalog_load_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_code text NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (airline_code, code)
);

CREATE INDEX idx_catalog_load_codes_airline ON public.catalog_load_codes(airline_code);

GRANT SELECT ON public.catalog_load_codes TO authenticated;
GRANT ALL ON public.catalog_load_codes TO service_role;

ALTER TABLE public.catalog_load_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read load codes"
  ON public.catalog_load_codes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert load codes"
  ON public.catalog_load_codes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update load codes"
  ON public.catalog_load_codes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete load codes"
  ON public.catalog_load_codes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_catalog_load_codes_updated_at
  BEFORE UPDATE ON public.catalog_load_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6) catalog_time_field_overrides
-- ============================================================
CREATE TABLE public.catalog_time_field_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_code text NOT NULL,
  field_key text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  label text,
  clock_color text CHECK (clock_color IN ('green','red','default') OR clock_color IS NULL),
  type text CHECK (type IN ('time','boolean','boolean-text') OR type IS NULL),
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (airline_code, field_key)
);

CREATE INDEX idx_catalog_time_field_overrides_airline
  ON public.catalog_time_field_overrides(airline_code);

GRANT SELECT ON public.catalog_time_field_overrides TO authenticated;
GRANT ALL ON public.catalog_time_field_overrides TO service_role;

ALTER TABLE public.catalog_time_field_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read time field overrides"
  ON public.catalog_time_field_overrides FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert time field overrides"
  ON public.catalog_time_field_overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update time field overrides"
  ON public.catalog_time_field_overrides FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete time field overrides"
  ON public.catalog_time_field_overrides FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_catalog_time_field_overrides_updated_at
  BEFORE UPDATE ON public.catalog_time_field_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
