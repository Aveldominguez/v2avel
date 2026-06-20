
-- Allow system-owned rows (user_id NULL = centralized ARION sync)
ALTER TABLE public.scheduled_flights ALTER COLUMN user_id DROP NOT NULL;

-- Replace unique constraint so system rows are unique by (flight_date, flight_number)
ALTER TABLE public.scheduled_flights DROP CONSTRAINT IF EXISTS scheduled_flights_unique;

-- Per-user uniqueness still applies when user_id is set
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_flights_user_unique
  ON public.scheduled_flights (user_id, flight_date, flight_number)
  WHERE user_id IS NOT NULL;

-- System (centralized) uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_flights_system_unique
  ON public.scheduled_flights (flight_date, flight_number)
  WHERE user_id IS NULL;

-- Replace SELECT policy: any approved authenticated user can read all rows
DROP POLICY IF EXISTS "Users can manage own scheduled flights" ON public.scheduled_flights;

CREATE POLICY "Authenticated users can read all flights"
  ON public.scheduled_flights
  FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Users can insert own scheduled flights"
  ON public.scheduled_flights
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Users can update own scheduled flights"
  ON public.scheduled_flights
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Users can delete own scheduled flights"
  ON public.scheduled_flights
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_approved(auth.uid()));
