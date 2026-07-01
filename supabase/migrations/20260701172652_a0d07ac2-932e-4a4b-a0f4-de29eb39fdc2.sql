DROP POLICY IF EXISTS "Authenticated users can insert ac load sheet data" ON public.ac_load_sheet_data;
DROP POLICY IF EXISTS "Authenticated users can update ac load sheet data" ON public.ac_load_sheet_data;
DROP POLICY IF EXISTS "Authenticated users can delete ac load sheet data" ON public.ac_load_sheet_data;

CREATE POLICY "Authenticated users can insert ac load sheet data"
  ON public.ac_load_sheet_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ac load sheet data"
  ON public.ac_load_sheet_data FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ac load sheet data"
  ON public.ac_load_sheet_data FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
