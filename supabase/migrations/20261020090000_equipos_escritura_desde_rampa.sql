-- Quien ve el estado de un equipo, puede cambiarlo.
--
-- Estaba descuadrado: LEER permitía tener el módulo de rampa O el de equipos,
-- pero ESCRIBIR exigía el de equipos. Y el editor de carga y parking vive
-- dentro de la escala, en la pantalla de rampa.
--
-- El resultado para un operario con rampa y sin equipos: veía el campo, podía
-- escribir en él, y la base de datos descartaba la fila. PostgREST no da error
-- en ese caso, sólo actualiza cero filas, así que la app no se enteraba y el
-- valor se perdía sin una sola queja. (El aviso ya está puesto en el código,
-- pero lo que había que arreglar es que se pudiera guardar.)
--
-- Se igualan las tres a la condición de lectura. Nada se abre de más: hay que
-- estar aprobado y tener uno de los dos módulos, que es justo lo que ya hacía
-- falta para ver la pantalla.
DROP POLICY IF EXISTS "Approved users with module access can insert equipment state" ON public.equipment_state;
CREATE POLICY "Approved users with module access can insert equipment state"
ON public.equipment_state
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_approved(auth.uid())
  AND (
    public.has_module_access(auth.uid(), 'rampa')
    OR public.has_module_access(auth.uid(), 'equipos')
  )
);

DROP POLICY IF EXISTS "Approved users with module access can update equipment state" ON public.equipment_state;
CREATE POLICY "Approved users with module access can update equipment state"
ON public.equipment_state
FOR UPDATE
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND (
    public.has_module_access(auth.uid(), 'rampa')
    OR public.has_module_access(auth.uid(), 'equipos')
  )
)
WITH CHECK (
  public.is_approved(auth.uid())
  AND (
    public.has_module_access(auth.uid(), 'rampa')
    OR public.has_module_access(auth.uid(), 'equipos')
  )
);

-- El historial (equipment_activity_log) ya permitía rampa desde el 12/06:
-- esa migración arregló las dos tablas y a equipment_state se le quedó sólo
-- 'equipos'. Era un descuido de aquel día, no una decisión.
