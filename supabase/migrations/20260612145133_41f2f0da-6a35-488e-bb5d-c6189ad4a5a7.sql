
-- 1. Catalog SELECT policies: require is_approved
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'catalog_airlines','catalog_aircraft_models','catalog_compartments',
    'catalog_holds','catalog_load_codes','catalog_time_field_overrides',
    'catalog_equipment_categories','catalog_equipment_units'
  ];
  polname text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR polname IN
      SELECT p.polname FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND p.polcmd='r'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', polname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "Approved users can read %I" ON public.%I FOR SELECT TO authenticated USING (public.is_approved(auth.uid()))',
      t, t
    );
  END LOOP;
END $$;

-- 2. Storage SELECT policies: add is_approved gate
DROP POLICY IF EXISTS "Users can view own loading sheets" ON storage.objects;
CREATE POLICY "Users can view own loading sheets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'loading-sheets'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND public.is_approved(auth.uid())
);

DROP POLICY IF EXISTS "Users can view own turnaround files" ON storage.objects;
CREATE POLICY "Users can view own turnaround files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'turnaround-files'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND public.is_approved(auth.uid())
);
