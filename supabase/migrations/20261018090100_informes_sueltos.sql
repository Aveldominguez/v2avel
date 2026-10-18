-- Informes que no van ligados a ninguna escala.
--
-- El informe de incidente vivía dentro de la escala, dentro de su JSONB. Los
-- que se hacen desde la pantalla de inicio no tienen escala donde meterse, y
-- además interesa poder volver a abrirlos y reexportarlos, así que van a su
-- propia tabla.
--
-- Todo el fichero se puede ejecutar más de una vez sin romper nada: la
-- primera aplicación se quedó a medias (Supabase corta en el primer error y
-- deja hecho lo anterior), y una migración que no se puede repetir obliga a
-- ir mirando a mano qué quedó creado y qué no.
CREATE TABLE IF NOT EXISTS public.standalone_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Nombre tal cual salió impreso. Se guarda copiado y no por referencia al
  -- perfil: si mañana alguien se cambia el nombre, el informe que ya se
  -- entregó firmado no puede cambiar solo.
  author_name TEXT NOT NULL,
  -- Día de los hechos, que no tiene por qué ser el de hoy.
  report_date DATE NOT NULL,
  -- Dónde ocurrió. Texto libre: vale un parking, una puerta o un almacén.
  location TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS standalone_reports_user_fecha
  ON public.standalone_reports (user_id, report_date DESC);

ALTER TABLE public.standalone_reports ENABLE ROW LEVEL SECURITY;

-- Cada uno los suyos; los administradores, todos (los informes de incidente
-- son justo lo que un responsable tiene que poder revisar).
DROP POLICY IF EXISTS "Usuarios ven sus informes" ON public.standalone_reports;
CREATE POLICY "Usuarios ven sus informes"
  ON public.standalone_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Usuarios crean sus informes" ON public.standalone_reports;
CREATE POLICY "Usuarios crean sus informes"
  ON public.standalone_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios editan sus informes" ON public.standalone_reports;
CREATE POLICY "Usuarios editan sus informes"
  ON public.standalone_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios borran sus informes" ON public.standalone_reports;
CREATE POLICY "Usuarios borran sus informes"
  ON public.standalone_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS standalone_reports_updated_at ON public.standalone_reports;
CREATE TRIGGER standalone_reports_updated_at
  BEFORE UPDATE ON public.standalone_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
