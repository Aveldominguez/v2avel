
DROP POLICY IF EXISTS "Module users read equipment state" ON public.equipment_state;
CREATE POLICY "Approved module users read equipment state"
ON public.equipment_state FOR SELECT
USING (
  is_approved(auth.uid())
  AND (
    has_module_access(auth.uid(), 'rampa')
    OR has_module_access(auth.uid(), 'equipos')
  )
);

DROP POLICY IF EXISTS "Approved users can read catalog_equipment_categories" ON public.catalog_equipment_categories;
CREATE POLICY "Approved module users read equipment categories"
ON public.catalog_equipment_categories FOR SELECT
USING (
  is_approved(auth.uid())
  AND (
    has_module_access(auth.uid(), 'rampa')
    OR has_module_access(auth.uid(), 'equipos')
  )
);

DROP POLICY IF EXISTS "Approved users can read catalog_equipment_units" ON public.catalog_equipment_units;
CREATE POLICY "Approved module users read equipment units"
ON public.catalog_equipment_units FOR SELECT
USING (
  is_approved(auth.uid())
  AND (
    has_module_access(auth.uid(), 'rampa')
    OR has_module_access(auth.uid(), 'equipos')
  )
);

CREATE POLICY "Owners read their arion credentials"
ON public.arion_credentials FOR SELECT
USING (auth.uid() = user_id AND is_approved(auth.uid()));
