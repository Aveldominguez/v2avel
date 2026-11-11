-- Personal que trabaja en cada escala.
--
-- La app NO escribe en esta tabla. El personal viaja dentro de la escala, en
-- times->'personal', y este disparador mantiene la tabla al día.
--
-- Se hizo así a propósito: un segundo camino de guardado sería un sitio más
-- donde perder datos sin cobertura, que es justo lo que pasó el 11/11/2026.
-- Yendo dentro de la escala hereda todo lo que ya la protege: el borrador del
-- móvil, la cola offline y el historial de pérdidas.

CREATE TABLE IF NOT EXISTS public.escala_personal (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turnaround_id uuid NOT NULL REFERENCES public.turnarounds(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  flight_number text,
  date          date,
  employee_id   text,                 -- NULL cuando el nombre se escribió a mano
  nombre        text NOT NULL,
  funcion       text,
  orden         int  NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS escala_personal_escala_idx ON public.escala_personal (turnaround_id, orden);
CREATE INDEX IF NOT EXISTS escala_personal_empleado_idx ON public.escala_personal (employee_id, date DESC);

ALTER TABLE public.escala_personal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cada uno ve el personal de sus escalas" ON public.escala_personal;
CREATE POLICY "Cada uno ve el personal de sus escalas" ON public.escala_personal
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "El admin ve todo el personal" ON public.escala_personal;
CREATE POLICY "El admin ve todo el personal" ON public.escala_personal
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Nadie escribe a mano: sólo el disparador, que va con SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.sincronizar_personal_de_escala()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lista jsonb;
BEGIN
  lista := COALESCE(NEW.times -> 'personal', '[]'::jsonb);
  IF jsonb_typeof(lista) <> 'array' THEN
    lista := '[]'::jsonb;
  END IF;

  -- Si la escala se guarda sin tocar el personal, no se toca la tabla: así un
  -- guardado cualquiera no borra y reescribe filas sin necesidad.
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.times -> 'personal', '[]'::jsonb) IS NOT DISTINCT FROM lista THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.escala_personal WHERE turnaround_id = NEW.id;

  INSERT INTO public.escala_personal (
    turnaround_id, user_id, flight_number, date, employee_id, nombre, funcion, orden
  )
  SELECT NEW.id, NEW.user_id, NEW.flight_number, NEW.date,
         NULLIF(p ->> 'employeeId', ''),
         NULLIF(TRIM(p ->> 'nombre'), ''),
         NULLIF(TRIM(p ->> 'funcion'), ''),
         (n - 1)
    FROM jsonb_array_elements(lista) WITH ORDINALITY AS t(p, n)
   WHERE NULLIF(TRIM(p ->> 'nombre'), '') IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_personal_de_escala ON public.turnarounds;
CREATE TRIGGER trg_personal_de_escala
  AFTER INSERT OR UPDATE ON public.turnarounds
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_personal_de_escala();
