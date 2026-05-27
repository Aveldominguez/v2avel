
-- ============================================================
-- 1. Catálogo de categorías de equipos
-- ============================================================
CREATE TABLE public.catalog_equipment_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Package',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_equipment_categories TO authenticated;
GRANT ALL ON public.catalog_equipment_categories TO service_role;
ALTER TABLE public.catalog_equipment_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read equipment categories"
  ON public.catalog_equipment_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage equipment categories insert"
  ON public.catalog_equipment_categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage equipment categories update"
  ON public.catalog_equipment_categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage equipment categories delete"
  ON public.catalog_equipment_categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. Catálogo de unidades
-- ============================================================
CREATE TABLE public.catalog_equipment_units (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES public.catalog_equipment_categories(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  fuel_type text NOT NULL DEFAULT 'battery' CHECK (fuel_type IN ('battery','fuel')),
  is_separator boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_equipment_units_category ON public.catalog_equipment_units(category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_equipment_units TO authenticated;
GRANT ALL ON public.catalog_equipment_units TO service_role;
ALTER TABLE public.catalog_equipment_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read equipment units"
  ON public.catalog_equipment_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage equipment units insert"
  ON public.catalog_equipment_units FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage equipment units update"
  ON public.catalog_equipment_units FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage equipment units delete"
  ON public.catalog_equipment_units FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Estado en vivo de cada equipo
-- ============================================================
CREATE TABLE public.equipment_state (
  unit_id text PRIMARY KEY REFERENCES public.catalog_equipment_units(id) ON DELETE CASCADE,
  parking text NOT NULL DEFAULT '',
  battery_level integer,
  is_charging boolean NOT NULL DEFAULT false,
  charging_since timestamptz,
  is_broken boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_state TO authenticated;
GRANT ALL ON public.equipment_state TO service_role;
ALTER TABLE public.equipment_state ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Permisos de acceso por módulo
-- ============================================================
CREATE TABLE public.user_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL CHECK (module IN ('rampa','equipos')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_module_access TO authenticated;
GRANT ALL ON public.user_module_access TO service_role;
ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own module access"
  ON public.user_module_access FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all module access"
  ON public.user_module_access FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert module access"
  ON public.user_module_access FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete module access"
  ON public.user_module_access FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Función de chequeo de acceso por módulo
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_module_access
      WHERE user_id = _user_id AND module = _module
    )
$$;

-- equipment_state: cualquier usuario con acceso a rampa o equipos puede leer/escribir
CREATE POLICY "Module users read equipment state"
  ON public.equipment_state FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Module users insert equipment state"
  ON public.equipment_state FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Module users update equipment state"
  ON public.equipment_state FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Admins delete equipment state"
  ON public.equipment_state FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. Activity log
-- ============================================================
CREATE TABLE public.equipment_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text,
  unit_id text,
  unit_code text,
  category_id text,
  field_changed text,
  old_value text,
  new_value text,
  source text NOT NULL DEFAULT 'equipos',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_equipment_log_created ON public.equipment_activity_log(created_at DESC);
GRANT SELECT, INSERT ON public.equipment_activity_log TO authenticated;
GRANT ALL ON public.equipment_activity_log TO service_role;
ALTER TABLE public.equipment_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Module users insert activity log"
  ON public.equipment_activity_log FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Admins read activity log"
  ON public.equipment_activity_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. Triggers updated_at
-- ============================================================
CREATE TRIGGER trg_equipment_categories_updated BEFORE UPDATE ON public.catalog_equipment_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_equipment_units_updated BEFORE UPDATE ON public.catalog_equipment_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_equipment_state_updated BEFORE UPDATE ON public.equipment_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.catalog_equipment_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.catalog_equipment_categories;

-- ============================================================
-- 9. Seed de categorías y unidades (desde Control Equipos)
-- ============================================================
INSERT INTO public.catalog_equipment_categories (id, name, icon, sort_order) VALUES
  ('tractores',      'TRACTORES',       'Truck',          10),
  ('cintas',         'CINTAS',          'ArrowRightLeft', 20),
  ('escaleras',      'ESCALERAS',       'ChevronsUp',     30),
  ('furgonetas',     'FURGONETAS',      'Car',            40),
  ('gpus',           'GPUS',            'Zap',            50),
  ('pushback',       'PUSHBACK',        'MoveLeft',       60),
  ('plataformas-gd', 'PLATAFORMAS GD',  'Package',        70),
  ('plataformas-pq', 'PLATAFORMAS PQ',  'BoxSelect',      80),
  ('transfer',       'TRANSFER',        'ArrowLeftRight', 90),
  ('jardineras',     'JARDINERAS',      'Bus',            100);

INSERT INTO public.catalog_equipment_units (id, category_id, code, label, fuel_type, is_separator, sort_order) VALUES
  -- TRACTORES
  ('tractores_8101','tractores','8101','8101','battery',false,10),
  ('tractores_8102','tractores','8102','8102','battery',false,20),
  ('tractores_8103','tractores','8103','8103','battery',false,30),
  ('tractores_8104','tractores','8104','8104','battery',false,40),
  ('tractores_8106','tractores','8106','8106','battery',false,50),
  ('tractores_8112','tractores','8112','8112','battery',false,60),
  ('tractores_8113','tractores','8113','8113','battery',false,70),
  ('tractores_8114','tractores','8114','8114','battery',false,80),
  ('tractores_8115','tractores','8115','8115','battery',false,90),
  ('tractores_COMB','tractores','COMBUSTIBLE','COMBUSTIBLE','fuel',true,100),
  ('tractores_8105','tractores','8105','8105','fuel',false,110),
  ('tractores_8109','tractores','8109','8109','fuel',false,120),
  ('tractores_1226','tractores','1226','1226','fuel',false,130),
  ('tractores_8106C','tractores','8106C','8106C','fuel',false,140),
  -- CINTAS
  ('cintas_8301','cintas','8301','8301','battery',false,10),
  ('cintas_8302','cintas','8302','8302','battery',false,20),
  ('cintas_8303','cintas','8303','8303','battery',false,30),
  ('cintas_8304','cintas','8304','8304','battery',false,40),
  ('cintas_PW8305','cintas','PW 8305','PW 8305','battery',false,50),
  ('cintas_8306','cintas','8306','8306','battery',false,60),
  ('cintas_8307','cintas','8307','8307','battery',false,70),
  ('cintas_8308','cintas','8308','8308','battery',false,80),
  ('cintas_8309','cintas','8309','8309','battery',false,90),
  ('cintas_8310','cintas','8310','8310','battery',false,100),
  ('cintas_8311','cintas','8311','8311','battery',false,110),
  -- ESCALERAS
  ('escaleras_8604','escaleras','8604','8604','battery',false,10),
  ('escaleras_8605','escaleras','8605','8605','battery',false,20),
  ('escaleras_8606','escaleras','8606','8606','battery',false,30),
  ('escaleras_8607','escaleras','8607','8607','battery',false,40),
  ('escaleras_8608','escaleras','8608','8608','battery',false,50),
  ('escaleras_8609','escaleras','8609','8609','battery',false,60),
  ('escaleras_8610','escaleras','8610','8610','battery',false,70),
  ('escaleras_8611','escaleras','8611','8611','battery',false,80),
  ('escaleras_8612','escaleras','8612','8612','battery',false,90),
  ('escaleras_8613','escaleras','8613','8613','battery',false,100),
  -- FURGONETAS
  ('furgonetas_TP5509','furgonetas','TP 5509','TP 5509','battery',false,10),
  ('furgonetas_5268','furgonetas','5268','5268','battery',false,20),
  ('furgonetas_5269','furgonetas','5269','5269','battery',false,30),
  ('furgonetas_5270','furgonetas','5270','5270','battery',false,40),
  ('furgonetas_5274','furgonetas','5274','5274','battery',false,50),
  ('furgonetas_5267','furgonetas','5267','5267','battery',false,60),
  -- GPUS
  ('gpus_BC8401','gpus','BC 8401','BC 8401','battery',false,10),
  ('gpus_BC8406','gpus','BC 8406','BC 8406','battery',false,20),
  ('gpus_AZ8404','gpus','AZ 8404','AZ 8404','battery',false,30),
  ('gpus_AZ8405','gpus','AZ 8405','AZ 8405','battery',false,40),
  ('gpus_GT8407','gpus','GT 8407','GT 8407','battery',false,50),
  ('gpus_POWERGT8400','gpus','Power GT 8400','Power GT 8400','battery',false,60),
  ('gpus_PETROLERO','gpus','PETROLERO','PETROLERO','fuel',true,70),
  ('gpus_GASOIL','gpus','GPU Gasoil','GPU Gasoil','fuel',false,80),
  -- PUSHBACK
  ('pushback_PQ8501','pushback','PQ 8501','PQ 8501','battery',false,10),
  ('pushback_PQ8500','pushback','PQ 8500','PQ 8500','battery',false,20),
  ('pushback_GD8703','pushback','GD 8703','GD 8703','battery',false,30),
  ('pushback_COMB','pushback','Combustible','Combustible','fuel',true,40),
  ('pushback_BARRA8701','pushback','BARRA 8701','BARRA 8701','fuel',false,50),
  -- PLATAFORMAS GD
  ('plataformas-gd_CA8204','plataformas-gd','CA 8204','CA 8204','battery',false,10),
  ('plataformas-gd_GT8205','plataformas-gd','GT 8205','GT 8205','battery',false,20),
  ('plataformas-gd_TP8209','plataformas-gd','TP 8209','TP 8209','battery',false,30),
  ('plataformas-gd_COMB','plataformas-gd','Combustible','Combustible','fuel',true,40),
  ('plataformas-gd_SEV4267','plataformas-gd','SEV 4267','SEV 4267','fuel',false,50),
  ('plataformas-gd_CH708203','plataformas-gd','CH70 8203','CH70 8203','fuel',false,60),
  -- PLATAFORMAS PQ
  ('plataformas-pq_8210','plataformas-pq','8210','8210','battery',false,10),
  ('plataformas-pq_8211','plataformas-pq','8211','8211','battery',false,20),
  ('plataformas-pq_COMB','plataformas-pq','Combustible','Combustible','fuel',true,30),
  ('plataformas-pq_8201','plataformas-pq','8201','8201','fuel',false,40),
  -- TRANSFER
  ('transfer_81300','transfer','81300','81300','battery',false,10),
  ('transfer_81301','transfer','81301','81301','battery',false,20),
  ('transfer_81302','transfer','81302','81302','battery',false,30),
  ('transfer_COMB','transfer','Combustible','Combustible','fuel',true,40),
  ('transfer_81303','transfer','81303','81303','fuel',false,50),
  -- JARDINERAS
  ('jardineras_8503','jardineras','8503','8503','battery',false,10),
  ('jardineras_9016','jardineras','9016','9016','battery',false,20),
  ('jardineras_COMB','jardineras','Combustible','Combustible','fuel',true,30),
  ('jardineras_4609','jardineras','4609','4609','fuel',false,40),
  ('jardineras_8502','jardineras','8502','8502','fuel',false,50),
  ('jardineras_8501','jardineras','8501','8501','fuel',false,60);

-- ============================================================
-- 10. Conceder acceso 'rampa' a todos los usuarios actuales aprobados
--     (para no romper el flujo existente).
-- ============================================================
INSERT INTO public.user_module_access (user_id, module)
SELECT user_id, 'rampa' FROM public.profiles WHERE approved = true
ON CONFLICT DO NOTHING;
