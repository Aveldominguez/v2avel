-- Fix equipment_activity_log INSERT: require approval
DROP POLICY IF EXISTS "Module users insert activity log" ON public.equipment_activity_log;
CREATE POLICY "Module users insert activity log"
ON public.equipment_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_approved(auth.uid())
  AND (
    public.has_module_access(auth.uid(), 'rampa')
    OR public.has_module_access(auth.uid(), 'equipos')
  )
);

-- Fix equipment_state policies: use correct module name 'equipos'
DROP POLICY IF EXISTS "Approved users with module access can insert equipment state" ON public.equipment_state;
CREATE POLICY "Approved users with module access can insert equipment state"
ON public.equipment_state
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_approved(auth.uid())
  AND public.has_module_access(auth.uid(), 'equipos')
);

DROP POLICY IF EXISTS "Approved users with module access can update equipment state" ON public.equipment_state;
CREATE POLICY "Approved users with module access can update equipment state"
ON public.equipment_state
FOR UPDATE
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND public.has_module_access(auth.uid(), 'equipos')
)
WITH CHECK (
  public.is_approved(auth.uid())
  AND public.has_module_access(auth.uid(), 'equipos')
);