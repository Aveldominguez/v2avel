-- Permiso de "conexión alternativa", por usuario.
--
-- Algunas operadoras españolas (O2, Movistar) bloquean rangos enteros de IP
-- de Cloudflare por las sentencias del fútbol. Como la base de datos y las
-- fotos viven detrás de Cloudflare, el agente afectado se queda sin app en
-- plena rampa. Con este permiso, su móvil entra por un servidor propio que
-- llega a los mismos sitios por otro camino.
--
-- Lo concede el administrador, uno a uno. No es un ajuste que el agente
-- active: va por el ancho de banda de un servidor de pago y no tiene sentido
-- que lo encienda quien no lo necesita.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS puerta_alternativa boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.puerta_alternativa IS
  'Si true, la app de este usuario sale por el servidor propio en lugar de por Cloudflare. Lo concede un administrador.';

-- El candado de siempre, ampliado.
--
-- Los usuarios pueden editar su propio perfil para cambiarse el nombre, y la
-- política congela los campos que suponen privilegios. Sin añadir aquí la
-- columna nueva, cualquiera podría concedérsela a sí mismo con una sola
-- petición: no daría acceso a datos ajenos —la autenticación y las políticas
-- siguen mandando igual por los dos caminos— pero sí metería a todo el que
-- quisiera por un servidor que paga otro.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND approved = (SELECT p.approved FROM public.profiles p WHERE p.user_id = auth.uid())
  AND blocked  = (SELECT p.blocked  FROM public.profiles p WHERE p.user_id = auth.uid())
  AND puerta_alternativa = (SELECT p.puerta_alternativa FROM public.profiles p WHERE p.user_id = auth.uid())
);
