-- Que NINGÚN dispositivo pueda vaciar una escala de golpe.
--
-- El 14/11 la PC1099 perdió tres veces seguidas los recuentos, el personal,
-- los equipos y las observaciones justo después de restaurarlos. La causa no
-- era la restauración: era otra pantalla con los datos viejos subiéndolos
-- encima, un minuto después.
--
-- Protegerlo en la app no vale: cada dispositivo compara con lo ÚLTIMO QUE ÉL
-- vio. Para el móvil que tiene la escala abierta y vacía, ese guardado es
-- inocente. Sólo la base de datos ve la verdad, porque es una sola.
--
-- Qué hace: si un guardado dejaría a CERO dos o más tipos de dato que sí
-- tenían contenido (recuentos, personal, equipos, bodegas, adjuntos,
-- observaciones), no se rechaza el guardado entero —eso cortaría el trabajo
-- en rampa— sino que se CONSERVA lo que iba a desaparecer y se deja pasar el
-- resto. El operario no se entera y no pierde nada.
--
-- Dos o más, no uno: vaciar un tipo puede ser deliberado (quitar a todo el
-- personal de una escala). Vaciar cuatro a la vez, nunca lo es.
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

-- Va ANTES que el disparador del histórico (los BEFORE corren por orden
-- alfabético de nombre, y "aa_" va primero): así el histórico ve ya el
-- guardado corregido y no apunta una pérdida que no ha ocurrido.
DROP TRIGGER IF EXISTS aa_no_vaciar_de_golpe ON public.turnarounds;
CREATE TRIGGER aa_no_vaciar_de_golpe
  BEFORE UPDATE ON public.turnarounds
  FOR EACH ROW
  EXECUTE FUNCTION public.no_vaciar_de_golpe();
