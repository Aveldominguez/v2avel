-- ============================================================
--  EJECUTAR EN EL SQL EDITOR DE SUPABASE  ·  PARTE 4
--  15/11/2026 · v2avel
--
--  Permite rellenar la meteorología de escalas ya trabajadas sin
--  riesgo de pisar nada de lo que tengan.
--  Se puede ejecutar entero de una vez.
-- ============================================================

-- Añade la meteorología a una escala que NO la tenga.
--
-- Se hace aquí y no desde la app porque la app tendría que leer la escala,
-- añadirle la meteo y volver a escribirla entera: si alguien la estuviera
-- tocando a la vez, ese viaje de ida y vuelta pisaría su trabajo. Así sólo
-- se toca la clave 'meteo' y nada más.
--
-- Si la escala ya tiene meteorología no se toca: un registro meteorológico
-- que se sobrescribe deja de servir como prueba.
CREATE OR REPLACE FUNCTION public.rellenar_meteo_escala(p_id uuid, p_meteo jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dueno uuid;
BEGIN
  SELECT user_id INTO dueno FROM public.turnarounds WHERE id = p_id;
  IF dueno IS NULL THEN
    RETURN false;
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = dueno) THEN
    RAISE EXCEPTION 'No puedes tocar una escala que no es tuya';
  END IF;

  UPDATE public.turnarounds
     SET times = jsonb_set(COALESCE(times, '{}'::jsonb), ARRAY['meteo'], p_meteo, true),
         updated_at = now()
   WHERE id = p_id
     AND (times -> 'meteo') IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.rellenar_meteo_escala(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.rellenar_meteo_escala(uuid, jsonb) TO authenticated;
