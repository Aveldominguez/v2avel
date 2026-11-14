-- Que el administrador pueda limpiar el histórico de datos recuperables.
--
-- Se acumula una copia por cada pérdida y otra por cada restauración, así que
-- con el uso diario la lista se hace larga y deja de poder gestionarse.
--
-- Sólo el administrador, y sólo BORRAR: nadie puede modificar una copia para
-- que diga otra cosa, porque entonces dejaría de ser una prueba de lo que
-- había. Y nadie puede insertarlas a mano: eso lo hacen sólo los disparadores.
DROP POLICY IF EXISTS "El admin limpia el historial" ON public.turnaround_history;
CREATE POLICY "El admin limpia el historial" ON public.turnaround_history
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Borrado automático de las copias previas a una restauración.
--
-- Cada vez que se recupera algo se guarda una copia de cómo estaba la escala
-- justo antes, por si el rescate sale mal. Esa red hace falta durante unos
-- días; pasada una semana sólo ensucia la lista y esconde las pérdidas de
-- verdad, que son las que hay que mirar.
--
-- Las copias de PÉRDIDA no se tocan nunca: esas son la prueba de lo que había
-- y sólo las borra el administrador a mano.
CREATE OR REPLACE FUNCTION public.limpiar_copias_previas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.turnaround_history
   WHERE motivo = 'antes-de-restaurar'
     AND saved_at < now() - interval '7 days';
$$;

-- Se limpia sola al escribirse una copia nueva, que es justo cuando la tabla
-- crece. Así no hace falta ninguna tarea programada ni que nadie se acuerde.
CREATE OR REPLACE FUNCTION public.guardar_version_si_se_pierden_datos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  antes   jsonb;
  despues jsonb;
BEGIN
  antes   := public.riqueza_escala(OLD.times, OLD.field_values, OLD.observations);
  despues := public.riqueza_escala(NEW.times, NEW.field_values, NEW.observations);

  IF public.hay_perdida(antes, despues) THEN
    INSERT INTO public.turnaround_history (
      turnaround_id, user_id, flight_number, date,
      times, field_values, observations,
      horas_antes, horas_despues, riqueza_antes, riqueza_despues, extra, motivo
    ) VALUES (
      OLD.id, OLD.user_id, OLD.flight_number, OLD.date,
      OLD.times, OLD.field_values, OLD.observations,
      (antes ->> 'horas')::int, (despues ->> 'horas')::int,
      antes, despues, public.foto_air_canada(OLD.id), 'perdida'
    );
    PERFORM public.limpiar_copias_previas();
  END IF;

  RETURN NEW;
END;
$$;
