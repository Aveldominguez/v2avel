-- ============================================================
--  EJECUTAR EN EL SQL EDITOR DE SUPABASE  ·  PARTE 3
--  15/11/2026 · v2avel
--
--  Guarda en su propia tabla la meteorología de cada escala, para
--  poder consultarla y exportarla sin abrir escala por escala.
--  Se puede ejecutar entero de una vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.escala_meteo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turnaround_id uuid NOT NULL REFERENCES public.turnarounds(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  flight_number text,
  date          date,
  -- El intervalo en que se trabajó: de calzos de llegada a calzos de salida.
  desde         timestamptz,
  hasta         timestamptz,
  -- Lo peor del intervalo, que es lo que hay que poder enseñar.
  alerta        text,
  viento_kt     int,
  racha_kt      int,
  -- Lo que estaba PREVISTO (TAF), anotado al empezar la escala.
  prevision     text,
  prevision_kt  int,
  -- Los partes crudos, tal cual los emite el aeropuerto: esto es la prueba.
  observaciones jsonb,
  taf           text,
  actualizado   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS escala_meteo_escala_idx ON public.escala_meteo (turnaround_id);
CREATE INDEX IF NOT EXISTS escala_meteo_alerta_idx ON public.escala_meteo (alerta, date DESC);

ALTER TABLE public.escala_meteo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cada uno ve la meteo de sus escalas" ON public.escala_meteo;
CREATE POLICY "Cada uno ve la meteo de sus escalas" ON public.escala_meteo
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "El admin ve toda la meteo" ON public.escala_meteo;
CREATE POLICY "El admin ve toda la meteo" ON public.escala_meteo
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- La app no escribe aquí: el registro viaja dentro de la escala (times.meteo)
-- y este disparador mantiene la tabla al día. Así hereda el borrador del
-- móvil, la cola sin cobertura y la protección contra guardados que vacían.
CREATE OR REPLACE FUNCTION public.sincronizar_meteo_de_escala()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m jsonb;
BEGIN
  m := NEW.times -> 'meteo';

  IF m IS NULL OR jsonb_typeof(m) <> 'object' THEN
    RETURN NEW;
  END IF;

  -- Si la meteo no ha cambiado, no se toca la tabla.
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.times -> 'meteo', 'null'::jsonb) IS NOT DISTINCT FROM m THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.escala_meteo WHERE turnaround_id = NEW.id;

  INSERT INTO public.escala_meteo (
    turnaround_id, user_id, flight_number, date, desde, hasta,
    alerta, viento_kt, racha_kt, prevision, prevision_kt, observaciones, taf
  ) VALUES (
    NEW.id, NEW.user_id, NEW.flight_number, NEW.date,
    NULLIF(m #>> '{ventana,desde}', '')::timestamptz,
    NULLIF(m #>> '{ventana,hasta}', '')::timestamptz,
    NULLIF(m #>> '{maximo,alerta}', ''),
    NULLIF(m #>> '{maximo,kt}', '')::int,
    NULLIF(m #>> '{maximo,racha}', '')::int,
    NULLIF(m #>> '{prevision,alerta}', ''),
    NULLIF(m #>> '{prevision,racha}', '')::int,
    m -> 'observaciones',
    NULLIF(m ->> 'taf', '')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meteo_de_escala ON public.turnarounds;
CREATE TRIGGER trg_meteo_de_escala
  AFTER INSERT OR UPDATE ON public.turnarounds
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_meteo_de_escala();
