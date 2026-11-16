-- ============================================================================
-- scheduled_flights: 502 MB de los 545 MB de la base de datos
-- ============================================================================
--
-- Esta tabla es una COPIA de la programación de vuelos de ARION, y nunca se
-- ha limpiado: lleva acumulando filas desde febrero. Cada fila guarda además
-- el logotipo de la aerolínea como imagen entera en base64, repetido en cada
-- uno de los vuelos de esa compañía: miles de copias del mismo dibujo.
--
-- Se puede borrar sin perder nada. Cuando una escala se crea, lo que viene de
-- ARION (origen, destino, LDM, logotipo, horarios) se copia DENTRO de la
-- escala, y el formulario está escrito para no pisar lo guardado si la fila
-- de ARION ya no existe:
--
--     if (logo !== null) setAirlineLogo(logo);   // TurnaroundForm.tsx
--
-- Las partes van por orden. MIRA LOS NÚMEROS ANTES DE BORRAR.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PARTE 1 — Mirar. No borra nada.
-- ----------------------------------------------------------------------------

-- 1a) Cuánto pesa cada cosa dentro de la tabla.
SELECT count(*) AS vuelos,
       pg_size_pretty(sum(pg_column_size(airline_logo))) AS logotipos,
       pg_size_pretty(sum(pg_column_size(ldm_raw))) AS ldm,
       pg_size_pretty(pg_total_relation_size('public.scheduled_flights')) AS tabla_entera
  FROM public.scheduled_flights;

-- 1b) Reparto por mes y cuánto se recuperaría guardando sólo lo reciente.
SELECT to_char(date_trunc('month', flight_date::date), 'YYYY-MM') AS mes,
       count(*) AS vuelos,
       pg_size_pretty(sum(pg_column_size(airline_logo))) AS logotipos
  FROM public.scheduled_flights
 GROUP BY 1
 ORDER BY 1;

-- 1c) Cuántas filas se irían con 60 días de margen.
SELECT count(*) FILTER (WHERE flight_date::date < current_date - 60) AS se_borrarian,
       count(*) FILTER (WHERE flight_date::date >= current_date - 60) AS se_quedan
  FROM public.scheduled_flights;


-- ----------------------------------------------------------------------------
-- PARTE 2 — Soltar los logotipos de lo que ya pasó.
--
-- Se quita la imagen, NO la fila: los horarios y el LDM siguen ahí por si
-- hace falta consultarlos. Las escalas ya creadas llevan su propio logotipo
-- dentro y no se enteran.
-- ----------------------------------------------------------------------------

UPDATE public.scheduled_flights
   SET airline_logo = NULL
 WHERE airline_logo IS NOT NULL
   AND flight_date::date < current_date - 2;


-- ----------------------------------------------------------------------------
-- PARTE 3 — Borrar la programación vieja.
--
-- Sesenta días es de sobra: se abre una escala del día y, como mucho, se
-- repasa una de la semana pasada, que además ya tiene todo copiado dentro.
-- ----------------------------------------------------------------------------

DELETE FROM public.scheduled_flights
 WHERE flight_date::date < current_date - 60;


-- ----------------------------------------------------------------------------
-- PARTE 4 — Devolver el espacio al disco.
--
-- IMPRESCINDIBLE. Un DELETE deja el hueco marcado como reutilizable pero NO
-- encoge el fichero, así que el panel de Supabase seguiría contando los 502
-- MB. Esto es lo que los baja de verdad. Tarda un poco y bloquea la tabla
-- mientras corre: hazlo cuando no estés trabajando una escala.
-- ----------------------------------------------------------------------------

VACUUM FULL public.scheduled_flights;


-- ----------------------------------------------------------------------------
-- PARTE 5 — Que no vuelva a pasar.
--
-- Una función que hace la limpieza sola. Sin esto, la tabla vuelve a los 500
-- MB en unos meses y estamos igual.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.limpiar_programacion_vieja(dias integer DEFAULT 60)
RETURNS TABLE (logotipos_soltados bigint, vuelos_borrados bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_logos bigint;
  n_filas bigint;
BEGIN
  UPDATE public.scheduled_flights
     SET airline_logo = NULL
   WHERE airline_logo IS NOT NULL
     AND flight_date::date < current_date - 2;
  GET DIAGNOSTICS n_logos = ROW_COUNT;

  DELETE FROM public.scheduled_flights
   WHERE flight_date::date < current_date - dias;
  GET DIAGNOSTICS n_filas = ROW_COUNT;

  RETURN QUERY SELECT n_logos, n_filas;
END;
$$;

REVOKE ALL ON FUNCTION public.limpiar_programacion_vieja(integer) FROM public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- PARTE 6 — Comprobar cómo quedó.
-- ----------------------------------------------------------------------------

SELECT count(*) AS vuelos,
       pg_size_pretty(pg_total_relation_size('public.scheduled_flights')) AS ocupa_ahora
  FROM public.scheduled_flights;
