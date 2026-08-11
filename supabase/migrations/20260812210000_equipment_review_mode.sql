-- Modo Revisión de equipos.
--
-- Una revisión es una "vuelta" al aeropuerto para localizar y registrar el
-- estado de los equipos. Es COMPARTIDA: varios compañeros pueden repartirse la
-- pista y ven el progreso del otro en tiempo real, sin revisar dos veces lo
-- mismo.
--
-- Pueden convivir VARIAS revisiones abiertas siempre que cubran categorías
-- distintas (uno revisa cintas y otro tractores a la vez). El solape se avisa
-- desde la app, que dice quién está revisando qué para poder coordinarse; no
-- se bloquea en base de datos a propósito.

CREATE TABLE public.equipment_review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_by UUID,
  started_by_name TEXT,
  -- Categorías incluidas en la revisión (siempre explícitas, para poder
  -- detectar solapes entre revisiones simultáneas).
  category_ids TEXT[] NOT NULL DEFAULT '{}',
  finished_at TIMESTAMPTZ,
  finished_by UUID,
  finished_by_name TEXT
);

CREATE TABLE public.equipment_review_checks (
  session_id UUID NOT NULL REFERENCES public.equipment_review_sessions(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES public.catalog_equipment_units(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by UUID,
  checked_by_name TEXT,
  -- 'data' = se registró parking/batería · 'confirmed' = visto sin cambios
  method TEXT NOT NULL DEFAULT 'data' CHECK (method IN ('data', 'confirmed')),
  PRIMARY KEY (session_id, unit_id)
);

CREATE INDEX idx_equipment_review_checks_session
  ON public.equipment_review_checks (session_id);

ALTER TABLE public.equipment_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_review_checks ENABLE ROW LEVEL SECURITY;

-- Mismo criterio de acceso que el resto del módulo de equipos.
CREATE POLICY "Module users read review sessions"
  ON public.equipment_review_sessions FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Module users insert review sessions"
  ON public.equipment_review_sessions FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Module users update review sessions"
  ON public.equipment_review_sessions FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Admins delete review sessions"
  ON public.equipment_review_sessions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Module users read review checks"
  ON public.equipment_review_checks FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Module users insert review checks"
  ON public.equipment_review_checks FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Module users update review checks"
  ON public.equipment_review_checks FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));
CREATE POLICY "Module users delete review checks"
  ON public.equipment_review_checks FOR DELETE TO authenticated
  USING (has_module_access(auth.uid(), 'rampa') OR has_module_access(auth.uid(), 'equipos'));

-- Tiempo real: que el progreso de un compañero se vea al instante.
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_review_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_review_checks;
