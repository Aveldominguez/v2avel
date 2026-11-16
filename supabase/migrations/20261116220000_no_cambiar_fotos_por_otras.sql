-- Que una pantalla desfasada no pueda CAMBIAR unas fotos por otras.
--
-- El 16/11 la AD8001 perdió dos hojas de carga recién subidas. El móvil tenía
-- la escala abierta con la lista anterior en pantalla y, al autoguardar,
-- escribió esa lista encima de las nuevas. La protección de vaciado no vio
-- nada raro: antes dos fotos, después dos fotos. Contaba cuántas había, no
-- cuáles eran.
--
-- La regla que se añade: un guardado que AÑADE adjuntos no puede, a la vez,
-- hacer desaparecer otros que ya estaban. Eso no es una corrección de nadie;
-- es una pantalla vieja pisando trabajo más reciente. Cuando pasa, se guardan
-- los dos conjuntos: lo que había y lo que llega.
--
-- Quitar una foto A SECAS sigue funcionando, que es como se borra de verdad:
-- si el guardado sólo quita y no añade nada, se respeta tal cual.
--
-- Un adjunto de más se ve y se quita en dos toques. Una hoja de carga perdida
-- no se recupera: el avión ya se ha ido.

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
  lista  text;
  viejos text[];
  nuevos text[];
  fusion jsonb;
BEGIN
  -- 1) Cambiar unas fotos por otras: se conservan las dos.
  FOREACH lista IN ARRAY ARRAY['loadingSheetUrls', 'fileUrls', 'observationPhotos'] LOOP
    CONTINUE WHEN jsonb_typeof(OLD.times -> lista) <> 'array'
               OR jsonb_typeof(NEW.times -> lista) <> 'array';

    SELECT COALESCE(array_agg(x ORDER BY n), '{}')
      INTO viejos FROM jsonb_array_elements_text(OLD.times -> lista) WITH ORDINALITY t(x, n);
    SELECT COALESCE(array_agg(x ORDER BY n), '{}')
      INTO nuevos FROM jsonb_array_elements_text(NEW.times -> lista) WITH ORDINALITY t(x, n);

    IF EXISTS (SELECT 1 FROM unnest(nuevos) e WHERE e <> ALL(viejos))
       AND EXISTS (SELECT 1 FROM unnest(viejos) e WHERE e <> ALL(nuevos)) THEN

      SELECT (OLD.times -> lista) || COALESCE(jsonb_agg(e ORDER BY n), '[]'::jsonb)
        INTO fusion
        FROM unnest(nuevos) WITH ORDINALITY u(e, n)
       WHERE e <> ALL(viejos);

      RAISE WARNING 'Guardado que cambiaba % de la escala % por otros: se conservan los dos', lista, OLD.id;
      NEW.times := jsonb_set(COALESCE(NEW.times, '{}'::jsonb), ARRAY[lista], fusion, true);
    END IF;
  END LOOP;

  -- 2) Vaciar dos o más tipos de dato de golpe: se conserva lo anterior.
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
    ELSIF clave = 'adjuntos' THEN
      NEW.times := jsonb_set(COALESCE(NEW.times, '{}'::jsonb), ARRAY['loadingSheetUrls'],
                             COALESCE(OLD.times -> 'loadingSheetUrls', '[]'::jsonb), true);
      NEW.times := jsonb_set(NEW.times, ARRAY['fileUrls'],
                             COALESCE(OLD.times -> 'fileUrls', '[]'::jsonb), true);
      NEW.times := jsonb_set(NEW.times, ARRAY['observationPhotos'],
                             COALESCE(OLD.times -> 'observationPhotos', '[]'::jsonb), true);
    ELSIF clave = 'meteo' THEN
      NEW.times := jsonb_set(COALESCE(NEW.times, '{}'::jsonb), ARRAY['meteo'],
                             COALESCE(OLD.times -> 'meteo', 'null'::jsonb), true);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
