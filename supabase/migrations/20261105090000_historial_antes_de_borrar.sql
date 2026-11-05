-- Copia de seguridad automática antes de que una escala pierda datos.
--
-- La AZ058 del 5/11/2026 se quedó sin una sola hora y no se pudo recuperar:
-- no había ningún histórico. Esto lo arregla para siempre. Cada vez que un
-- UPDATE deja MENOS horas de las que había, se guarda primero la versión
-- anterior. Sólo cuando se pierde algo, así que no engorda la base de datos.

CREATE TABLE IF NOT EXISTS public.turnaround_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turnaround_id uuid NOT NULL,
  user_id       uuid NOT NULL,
  flight_number text,
  date          date,
  times         jsonb,
  field_values  jsonb,
  observations  text,
  horas_antes   int,
  horas_despues int,
  saved_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS turnaround_history_escala_idx
  ON public.turnaround_history (turnaround_id, saved_at DESC);

ALTER TABLE public.turnaround_history ENABLE ROW LEVEL SECURITY;

-- Cada uno ve su propio histórico. Nadie lo modifica ni lo borra a mano:
-- sólo escribe el trigger, que va con SECURITY DEFINER.
DROP POLICY IF EXISTS "Cada uno ve su historial" ON public.turnaround_history;
CREATE POLICY "Cada uno ve su historial" ON public.turnaround_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guardar_version_si_se_pierden_datos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  antes   int;
  despues int;
BEGIN
  SELECT count(*) INTO antes
    FROM jsonb_each_text(COALESCE(OLD.times, '{}'::jsonb))
   WHERE value ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';

  SELECT count(*) INTO despues
    FROM jsonb_each_text(COALESCE(NEW.times, '{}'::jsonb))
   WHERE value ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';

  IF despues < antes THEN
    INSERT INTO public.turnaround_history (
      turnaround_id, user_id, flight_number, date,
      times, field_values, observations, horas_antes, horas_despues
    ) VALUES (
      OLD.id, OLD.user_id, OLD.flight_number, OLD.date,
      OLD.times, OLD.field_values, OLD.observations, antes, despues
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historial_antes_de_borrar ON public.turnarounds;
CREATE TRIGGER trg_historial_antes_de_borrar
  BEFORE UPDATE ON public.turnarounds
  FOR EACH ROW
  EXECUTE FUNCTION public.guardar_version_si_se_pierden_datos();
