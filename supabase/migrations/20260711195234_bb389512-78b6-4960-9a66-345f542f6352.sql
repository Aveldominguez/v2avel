
-- 1) arion_config: hide password column from authenticated (admins) SELECT
REVOKE SELECT ON public.arion_config FROM authenticated;
GRANT SELECT (id, station_code, username, updated_at, updated_by) ON public.arion_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.arion_config TO authenticated;

-- 2) equipment_activity_log: allow users to read their own entries
CREATE POLICY "Users read own activity log"
ON public.equipment_activity_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
