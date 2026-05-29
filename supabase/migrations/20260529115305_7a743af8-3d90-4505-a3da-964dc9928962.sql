
-- 1. Lock down equipment_activity_log inserts: enforce user_id = auth.uid()
DROP POLICY IF EXISTS "Module users insert activity log" ON public.equipment_activity_log;

CREATE POLICY "Module users insert activity log"
ON public.equipment_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.has_module_access(auth.uid(), 'rampa')
    OR public.has_module_access(auth.uid(), 'equipos')
  )
);

-- 2. Require approved (and not blocked) users for all turnaround operations.
DROP POLICY IF EXISTS "Users can view their own turnarounds" ON public.turnarounds;
DROP POLICY IF EXISTS "Users can create their own turnarounds" ON public.turnarounds;
DROP POLICY IF EXISTS "Users can update their own turnarounds" ON public.turnarounds;
DROP POLICY IF EXISTS "Users can delete their own turnarounds" ON public.turnarounds;

CREATE POLICY "Users can view their own turnarounds"
ON public.turnarounds
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Users can create their own turnarounds"
ON public.turnarounds
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Users can update their own turnarounds"
ON public.turnarounds
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Users can delete their own turnarounds"
ON public.turnarounds
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));
