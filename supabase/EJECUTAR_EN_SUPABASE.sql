-- ============================================================
--  EJECUTAR EN EL SQL EDITOR DE SUPABASE
--  Generado el 14/11/2026 · v2avel
--
--  Contiene, en orden:
--    1. Recuperar TODO lo de una escala (no sólo las horas)
--    2. Air Canada: contadores y LIR con su propia copia
--    3. Restaurar: devuelve todo y lo puede usar el dueño de la escala
--    4. El administrador puede limpiar el histórico
--    5. Las copias previas a una restauración se borran solas a los 7 días
--
--  Probado contra PostgreSQL 17 antes de entregarlo.
--  Se puede ejecutar entero de una vez.
-- ============================================================

-- Recuperar TODO lo que se registra en una escala, no sólo las horas.
--
-- El histórico sólo saltaba cuando menguaba el número de horas HH:MM. Si lo
-- que se perdía eran las bodegas, los recuentos de maletas, el personal, los
-- adjuntos o las observaciones, no se guardaba copia de nada y el operario se
-- quedaba sin red: justo la información crítica de qué va en el avión.

-- 1. Cuánta información tiene una escala, por tipo.
CREATE OR REPLACE FUNCTION public.riqueza_escala(t jsonb, fv jsonb, obs text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'horas', (SELECT count(*) FROM jsonb_each_text(COALESCE(t, '{}'::jsonb))
               WHERE value ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    'bodegas', (SELECT count(*) FROM jsonb_each_text(
                  CASE WHEN jsonb_typeof(t -> 'bodegasData') = 'object'
                       THEN t -> 'bodegasData' ELSE '{}'::jsonb END)
                WHERE COALESCE(TRIM(value), '') <> ''),
    'personal', COALESCE(jsonb_array_length(
                  CASE WHEN jsonb_typeof(t -> 'personal') = 'array' THEN t -> 'personal' END), 0),
    'equipos', COALESCE(jsonb_array_length(
                  CASE WHEN jsonb_typeof(t -> 'equipment') = 'array' THEN t -> 'equipment' END), 0),
    'adjuntos',
        COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(t -> 'loadingSheetUrls') = 'array' THEN t -> 'loadingSheetUrls' END), 0)
      + COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(t -> 'fileUrls') = 'array' THEN t -> 'fileUrls' END), 0)
      + COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(t -> 'observationPhotos') = 'array' THEN t -> 'observationPhotos' END), 0),
    'campos', (SELECT count(*) FROM jsonb_array_elements(
                 CASE WHEN jsonb_typeof(fv) = 'array' THEN fv ELSE '[]'::jsonb END) e
               WHERE COALESCE(TRIM(e ->> 'value'), '') <> ''),
    'observaciones', CASE WHEN COALESCE(TRIM(obs), '') = '' THEN 0 ELSE 1 END
  );
$$;

-- 2. ¿Ha menguado algo? Basta con que baje UNA de las cuentas.
CREATE OR REPLACE FUNCTION public.hay_perdida(antes jsonb, despues jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_each_text(antes) a
     WHERE (a.value)::int > COALESCE((despues ->> a.key)::int, 0)
  );
$$;

-- 3. Columnas nuevas del histórico.
ALTER TABLE public.turnaround_history ADD COLUMN IF NOT EXISTS riqueza_antes   jsonb;
ALTER TABLE public.turnaround_history ADD COLUMN IF NOT EXISTS riqueza_despues jsonb;
-- Air Canada guarda el escaneo y los contadores en tablas aparte: su copia
-- viaja aquí, junto a la de la escala, para poder devolverlo todo de una vez.
ALTER TABLE public.turnaround_history ADD COLUMN IF NOT EXISTS extra jsonb;
ALTER TABLE public.turnaround_history ADD COLUMN IF NOT EXISTS motivo text;

-- 4. Foto de lo que Air Canada tiene en ese momento.
CREATE OR REPLACE FUNCTION public.foto_air_canada(p_turnaround uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    -- La fila ENTERA, con su id: al devolverla entra tal cual era. Quitando
    -- el id, el INSERT lo ponía a nulo y reventaba la restricción NOT NULL.
    'bulk',      COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM public.ac_bulk_data b
                            WHERE b.turnaround_id = p_turnaround), '[]'::jsonb),
    'loadSheet', COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM public.ac_load_sheet_data l
                            WHERE l.turnaround_id = p_turnaround), '[]'::jsonb)
  );
$$;

-- 5. El disparador de la escala, ahora mirándolo todo.
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
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Air Canada: cuando se borran filas, se guarda copia antes de perderlas.
--    Es un disparador por SENTENCIA, no por fila: el escáner borra decenas de
--    golpe y no tiene sentido una copia por cada una.
CREATE OR REPLACE FUNCTION public.guardar_ac_borrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.turnaround_history (
    turnaround_id, user_id, flight_number, date,
    times, field_values, observations,
    horas_antes, horas_despues, extra, motivo
  )
  SELECT t.id, t.user_id, t.flight_number, t.date,
         t.times, t.field_values, t.observations,
         -1, -1,
         jsonb_build_object(TG_ARGV[0], jsonb_agg(to_jsonb(b))),
         'air-canada'
    FROM borradas b
    JOIN public.turnarounds t ON t.id = b.turnaround_id
   GROUP BY t.id, t.user_id, t.flight_number, t.date, t.times, t.field_values, t.observations;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ac_bulk_borrado ON public.ac_bulk_data;
CREATE TRIGGER trg_ac_bulk_borrado
  AFTER DELETE ON public.ac_bulk_data
  REFERENCING OLD TABLE AS borradas
  FOR EACH STATEMENT EXECUTE FUNCTION public.guardar_ac_borrado('bulk');

DROP TRIGGER IF EXISTS trg_ac_load_sheet_borrado ON public.ac_load_sheet_data;
CREATE TRIGGER trg_ac_load_sheet_borrado
  AFTER DELETE ON public.ac_load_sheet_data
  REFERENCING OLD TABLE AS borradas
  FOR EACH STATEMENT EXECUTE FUNCTION public.guardar_ac_borrado('loadSheet');

-- 7. Devolver los datos perdidos: TODO, no sólo las horas.
--
-- Sólo RELLENA lo que ahora está vacío; nunca pisa nada. Un rescate no puede
-- convertirse en un segundo borrado, así que si después de la pérdida alguien
-- apuntó algo, eso manda.
--
-- Lo puede usar el administrador, y también el dueño de la escala: así cada
-- uno se recupera lo suyo sin tener que pedírselo a nadie.
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
  fv_ahora jsonb;
  fv_nuevo jsonb;
  obs_now  text;
  lista    text[] := '{}';
  clave    text;
  valor    jsonb;
  e        jsonb;
  n_ac     int := 0;
BEGIN
  SELECT * INTO v FROM public.turnaround_history WHERE id = p_history_id;
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'Esa versión del histórico no existe';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = v.user_id) THEN
    RAISE EXCEPTION 'No puedes restaurar datos de una escala que no es tuya';
  END IF;

  SELECT times, field_values, observations INTO actuales, fv_ahora, obs_now
    FROM public.turnarounds WHERE id = v.turnaround_id;
  IF actuales IS NULL THEN
    RAISE EXCEPTION 'La escala ya no existe';
  END IF;

  nuevas := actuales;

  -- 7a. Campos sueltos de la escala: horas y cualquier otro texto o número.
  FOR clave, valor IN SELECT key, value FROM jsonb_each(COALESCE(v.times, '{}'::jsonb))
  LOOP
    IF jsonb_typeof(valor) IN ('string', 'number')
       AND COALESCE(TRIM(valor #>> '{}'), '') <> ''
       AND COALESCE(NULLIF(TRIM(COALESCE(actuales #>> ARRAY[clave], '')), ''), NULL) IS NULL THEN
      nuevas := jsonb_set(nuevas, ARRAY[clave], valor);
      lista  := lista || clave;
    END IF;
  END LOOP;

  -- 7b. Bodegas: compartimento a compartimento, sin tocar los que ya tengan dato.
  IF jsonb_typeof(v.times -> 'bodegasData') = 'object' THEN
    -- jsonb_set NO crea los objetos intermedios: si la escala se quedó sin
    -- bodegasData entero, hay que ponerlo vacío antes o no se escribe nada y
    -- encima parece que sí (la lista de devueltos salía llena).
    -- IS DISTINCT FROM, no <>: jsonb_typeof devuelve NULL si la clave no
    -- existe, y NULL <> 'object' no es cierto, así que el IF nunca entraba y
    -- las bodegas se daban por devueltas sin haberlas escrito.
    IF jsonb_typeof(nuevas -> 'bodegasData') IS DISTINCT FROM 'object' THEN
      nuevas := jsonb_set(nuevas, ARRAY['bodegasData'], '{}'::jsonb, true);
    END IF;
    FOR clave, valor IN SELECT key, value FROM jsonb_each(v.times -> 'bodegasData')
    LOOP
      IF COALESCE(TRIM(valor #>> '{}'), '') <> ''
         AND COALESCE(NULLIF(TRIM(COALESCE(actuales #> ARRAY['bodegasData', clave] #>> '{}', '')), ''), NULL) IS NULL THEN
        nuevas := jsonb_set(nuevas, ARRAY['bodegasData', clave], valor, true);
        lista  := lista || ('bodega ' || clave);
      END IF;
    END LOOP;
  END IF;

  -- 7c. Listas (personal, equipos, adjuntos): se devuelven sólo si ahora están
  --     vacías. Mezclarlas crearía duplicados imposibles de limpiar a mano.
  FOREACH clave IN ARRAY ARRAY['personal', 'equipment', 'loadingSheetUrls', 'fileUrls', 'observationPhotos']
  LOOP
    IF jsonb_typeof(v.times -> clave) = 'array'
       AND jsonb_array_length(v.times -> clave) > 0
       AND COALESCE(jsonb_array_length(
             CASE WHEN jsonb_typeof(actuales -> clave) = 'array' THEN actuales -> clave END), 0) = 0 THEN
      nuevas := jsonb_set(nuevas, ARRAY[clave], v.times -> clave, true);
      lista  := lista || (clave || ' (' || jsonb_array_length(v.times -> clave) || ')');
    END IF;
  END LOOP;

  -- 7d. Recuentos por campo (maletas, BY, DOM, BF…): los que falten.
  fv_nuevo := CASE WHEN jsonb_typeof(fv_ahora) = 'array' THEN fv_ahora ELSE '[]'::jsonb END;
  IF jsonb_typeof(v.field_values) = 'array' THEN
    FOR e IN SELECT value FROM jsonb_array_elements(v.field_values)
    LOOP
      IF COALESCE(TRIM(e ->> 'value'), '') <> ''
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(fv_nuevo) a
            WHERE a ->> 'fieldDefinitionId' = e ->> 'fieldDefinitionId'
              AND COALESCE(TRIM(a ->> 'value'), '') <> ''
         ) THEN
        fv_nuevo := fv_nuevo || jsonb_build_array(e);
        lista    := lista || ('campo ' || COALESCE(e ->> 'fieldDefinitionId', '?'));
      END IF;
    END LOOP;
  END IF;

  -- 7e. Observaciones, si ahora no hay ninguna.
  IF COALESCE(TRIM(v.observations), '') <> '' AND COALESCE(TRIM(obs_now), '') = '' THEN
    obs_now := v.observations;
    -- El tipo hay que decirlo: sin el ::text, Postgres toma el literal por
    -- un array y revienta con "malformed array literal".
    lista   := lista || 'observaciones'::text;
  END IF;

  -- 7f. Air Canada: se reponen sólo si la escala no tiene ya filas suyas.
  IF jsonb_typeof(v.extra -> 'bulk') = 'array' AND jsonb_array_length(v.extra -> 'bulk') > 0
     AND NOT EXISTS (SELECT 1 FROM public.ac_bulk_data WHERE turnaround_id = v.turnaround_id) THEN
    INSERT INTO public.ac_bulk_data
    SELECT * FROM jsonb_populate_recordset(NULL::public.ac_bulk_data, v.extra -> 'bulk')
    ON CONFLICT (id) DO NOTHING;
    GET DIAGNOSTICS n_ac = ROW_COUNT;
    lista := lista || ('Air Canada contadores (' || n_ac || ')');
  END IF;

  IF jsonb_typeof(v.extra -> 'loadSheet') = 'array' AND jsonb_array_length(v.extra -> 'loadSheet') > 0
     AND NOT EXISTS (SELECT 1 FROM public.ac_load_sheet_data WHERE turnaround_id = v.turnaround_id) THEN
    INSERT INTO public.ac_load_sheet_data
    SELECT * FROM jsonb_populate_recordset(NULL::public.ac_load_sheet_data, v.extra -> 'loadSheet')
    ON CONFLICT (id) DO NOTHING;
    GET DIAGNOSTICS n_ac = ROW_COUNT;
    lista := lista || ('Air Canada LIR (' || n_ac || ')');
  END IF;

  IF array_length(lista, 1) IS NULL THEN
    RETURN QUERY SELECT 0, lista;
    RETURN;
  END IF;

  -- Red por si la restauración fuese un error: queda la versión de ahora.
  INSERT INTO public.turnaround_history (
    turnaround_id, user_id, flight_number, date,
    times, field_values, observations, horas_antes, horas_despues, extra, motivo
  )
  SELECT t.id, t.user_id, t.flight_number, t.date,
         t.times, t.field_values, t.observations, -1, -1,
         public.foto_air_canada(t.id), 'antes-de-restaurar'
    FROM public.turnarounds t WHERE t.id = v.turnaround_id;

  UPDATE public.turnarounds
     SET times = nuevas, field_values = fv_nuevo, observations = obs_now, updated_at = now()
   WHERE id = v.turnaround_id;

  RETURN QUERY SELECT array_length(lista, 1), lista;
END;
$$;

REVOKE ALL ON FUNCTION public.restaurar_horas(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.restaurar_horas(uuid) TO authenticated;


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
