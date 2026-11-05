-- Recuperar datos desde el panel de administración, sin tocar la base de datos.
--
-- El histórico del trigger sólo servía consultando Supabase a mano, y eso en
-- rampa no vale: el administrador no tiene el ordenador delante. Esto le deja
-- ver las pérdidas y devolver las horas desde el móvil.

-- 1. El administrador ve el histórico de todos; cada usuario, sólo el suyo.
DROP POLICY IF EXISTS "El admin ve todo el historial" ON public.turnaround_history;
CREATE POLICY "El admin ve todo el historial" ON public.turnaround_history
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 2. Devolver las horas perdidas de una versión guardada.
--
-- RELLENA los campos que ahora están vacíos; NO pisa nada de lo que haya.
-- Un rescate no puede convertirse en un segundo borrado: si después de la
-- pérdida alguien apuntó una hora, esa manda. Y antes de escribir guarda otra
-- versión, así que incluso una restauración equivocada se puede deshacer.
CREATE OR REPLACE FUNCTION public.restaurar_horas(p_history_id uuid)
RETURNS TABLE (devueltos int, campos text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v        public.turnaround_history;
  actuales jsonb;
  nuevas   jsonb;
  lista    text[] := '{}';
  clave    text;
  valor    text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sólo el administrador puede restaurar horas';
  END IF;

  SELECT * INTO v FROM public.turnaround_history WHERE id = p_history_id;
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'Esa versión del histórico no existe';
  END IF;

  SELECT times INTO actuales FROM public.turnarounds WHERE id = v.turnaround_id;
  IF actuales IS NULL THEN
    RAISE EXCEPTION 'La escala ya no existe';
  END IF;

  nuevas := actuales;
  FOR clave, valor IN SELECT key, value FROM jsonb_each_text(COALESCE(v.times, '{}'::jsonb))
  LOOP
    IF valor ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       AND COALESCE(NULLIF(actuales->>clave, ''), NULL) IS NULL THEN
      nuevas := jsonb_set(nuevas, ARRAY[clave], to_jsonb(valor));
      lista  := lista || clave;
    END IF;
  END LOOP;

  IF array_length(lista, 1) IS NULL THEN
    RETURN QUERY SELECT 0, lista;
    RETURN;
  END IF;

  -- Red por si la restauración fuese un error: queda la versión de ahora.
  INSERT INTO public.turnaround_history (
    turnaround_id, user_id, flight_number, date,
    times, field_values, observations, horas_antes, horas_despues
  )
  SELECT t.id, t.user_id, t.flight_number, t.date,
         t.times, t.field_values, t.observations, -1, -1
    FROM public.turnarounds t WHERE t.id = v.turnaround_id;

  UPDATE public.turnarounds
     SET times = nuevas, updated_at = now()
   WHERE id = v.turnaround_id;

  RETURN QUERY SELECT array_length(lista, 1), lista;
END;
$$;

REVOKE ALL ON FUNCTION public.restaurar_horas(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.restaurar_horas(uuid) TO authenticated;
