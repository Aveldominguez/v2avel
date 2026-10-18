-- Que cada uno pueda cambiar su propio nombre.
--
-- Hasta ahora sólo los administradores podían tocar la tabla de perfiles. Se
-- podría haber añadido una política de UPDATE para el dueño de la fila, pero
-- eso le dejaría escribir TODAS sus columnas, incluidas `approved` y
-- `blocked`: cualquiera podría aprobarse a sí mismo o desbloquearse.
--
-- Por eso se hace con una función que toca una sola columna. No hay política
-- nueva, así que la superficie no cambia: lo único que puede hacer un usuario
-- sobre su perfil es ponerse nombre.
CREATE OR REPLACE FUNCTION public.update_my_display_name(nuevo_nombre TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limpio TEXT := btrim(regexp_replace(COALESCE(nuevo_nombre, ''), '\s+', ' ', 'g'));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No hay sesión iniciada';
  END IF;
  IF length(limpio) = 0 THEN
    RAISE EXCEPTION 'El nombre no puede estar vacío';
  END IF;
  IF length(limpio) > 60 THEN
    RAISE EXCEPTION 'El nombre no puede pasar de 60 caracteres';
  END IF;

  UPDATE public.profiles
     SET display_name = limpio, updated_at = now()
   WHERE user_id = auth.uid();

  RETURN limpio;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_display_name(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_display_name(TEXT) TO authenticated;

COMMENT ON FUNCTION public.update_my_display_name(TEXT) IS
  'Cambia el nombre visible del usuario que llama. Única vía por la que un usuario modifica su propio perfil.';
