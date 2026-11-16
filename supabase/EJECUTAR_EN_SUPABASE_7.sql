-- ============================================================================
-- Los partes de viento de la escala, dentro de la red de seguridad
-- ============================================================================
--
-- Hasta ahora la meteorología se guardaba con la escala pero NO estaba
-- protegida: si un guardado llegaba sin ella, se borraba sin que saltara
-- nada y sin que el recuperador la mencionara. Es el mismo agujero por el
-- que se perdieron los recuentos de la PC1099.
--
-- Importa porque el parte de viento es la prueba de por qué se tomó una
-- decisión de seguridad, y pasados ocho días el aeropuerto ya no lo guarda:
-- si se pierde, se pierde para siempre.
--
-- Esto hace dos cosas:
--   1. riqueza_escala() pasa a contar los partes de viento.
--   2. no_vaciar_de_golpe() sabe devolverlos si un guardado los vacía.
--
-- Se puede ejecutar más de una vez sin problema.
-- ============================================================================

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
    'observaciones', CASE WHEN COALESCE(TRIM(obs), '') = '' THEN 0 ELSE 1 END,
    -- Los partes de viento anotados durante la escala. Espejo de riqueza()
    -- en src/utils/guardadoSeguro.ts: los dos tienen que contar igual.
    'meteo', COALESCE(jsonb_array_length(
                CASE WHEN jsonb_typeof(t -> 'meteo' -> 'observaciones') = 'array'
                     THEN t -> 'meteo' -> 'observaciones' END), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.no_vaciar_de_golpe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a      jsonb;
  d      jsonb;
  vacios text[];
  clave  text;
BEGIN
  a := public.riqueza_escala(OLD.times, OLD.field_values, OLD.observations);
  d := public.riqueza_escala(NEW.times, NEW.field_values, NEW.observations);

  SELECT COALESCE(array_agg(x.key), '{}')
    INTO vacios
    FROM jsonb_each_text(a) x
   WHERE x.key <> 'horas'
     AND (x.value)::int > 0
     AND COALESCE((d ->> x.key)::int, 0) = 0;

  IF COALESCE(array_length(vacios, 1), 0) < 2 THEN
    RETURN NEW;
  END IF;

  RAISE WARNING 'Guardado que vaciaba % en la escala %: se conserva lo anterior', vacios, OLD.id;

  FOREACH clave IN ARRAY vacios LOOP
    IF clave = 'campos' THEN
      NEW.field_values := OLD.field_values;
    ELSIF clave = 'observaciones' THEN
      NEW.observations := OLD.observations;
    ELSIF clave = 'bodegas' THEN
      NEW.times := jsonb_set(COALESCE(NEW.times, '{}'::jsonb), ARRAY['bodegasData'],
                             COALESCE(OLD.times -> 'bodegasData', '{}'::jsonb), true);
    ELSIF clave = 'personal' THEN
      NEW.times := jsonb_set(COALESCE(NEW.times, '{}'::jsonb), ARRAY['personal'],
                             COALESCE(OLD.times -> 'personal', '[]'::jsonb), true);
    ELSIF clave = 'equipos' THEN
      NEW.times := jsonb_set(COALESCE(NEW.times, '{}'::jsonb), ARRAY['equipment'],
                             COALESCE(OLD.times -> 'equipment', '[]'::jsonb), true);
    ELSIF clave = 'meteo' THEN
      -- Se devuelve el registro entero: la ventana, los partes y el TAF van
      -- juntos y por separado no prueban nada.
      NEW.times := jsonb_set(COALESCE(NEW.times, '{}'::jsonb), ARRAY['meteo'],
                             COALESCE(OLD.times -> 'meteo', 'null'::jsonb), true);
    ELSIF clave = 'adjuntos' THEN
      NEW.times := jsonb_set(COALESCE(NEW.times, '{}'::jsonb), ARRAY['loadingSheetUrls'],
                             COALESCE(OLD.times -> 'loadingSheetUrls', '[]'::jsonb), true);
      NEW.times := jsonb_set(NEW.times, ARRAY['fileUrls'],
                             COALESCE(OLD.times -> 'fileUrls', '[]'::jsonb), true);
      NEW.times := jsonb_set(NEW.times, ARRAY['observationPhotos'],
                             COALESCE(OLD.times -> 'observationPhotos', '[]'::jsonb), true);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
