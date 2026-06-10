-- Pin email in profiles update trigger, and require approved users for equipment_state writes

-- Update the trigger to also pin email for non-admins
CREATE OR REPLACE FUNCTION public.profiles_prevent_privileged_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.user_id  := OLD.user_id;
  NEW.email    := OLD.email;
  NEW.approved := OLD.approved;
  NEW.blocked  := OLD.blocked;
  RETURN NEW;
END;
$function$;

-- Tighten equipment_state INSERT/UPDATE policies to require approved status
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment_state'
      AND cmd IN ('INSERT','UPDATE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.equipment_state', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Approved users with module access can insert equipment state"
ON public.equipment_state
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_approved(auth.uid())
  AND public.has_module_access(auth.uid(), 'equipment')
);

CREATE POLICY "Approved users with module access can update equipment state"
ON public.equipment_state
FOR UPDATE
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND public.has_module_access(auth.uid(), 'equipment')
)
WITH CHECK (
  public.is_approved(auth.uid())
  AND public.has_module_access(auth.uid(), 'equipment')
);
