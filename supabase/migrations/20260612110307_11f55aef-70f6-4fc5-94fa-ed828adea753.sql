CREATE TABLE IF NOT EXISTS public.scheduled_flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flight_date date NOT NULL,
  flight_number text NOT NULL,
  airline_code text,
  registration text,
  aircraft_type text,
  parking_code text,
  source_station text,
  edt text,
  adt text,
  sdt text,
  movement_type text,
  cancelled boolean DEFAULT false,
  flight_closed boolean DEFAULT false,
  synced_at timestamptz DEFAULT now(),
  CONSTRAINT scheduled_flights_unique UNIQUE (user_id, flight_date, flight_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_flights TO authenticated;
GRANT ALL ON public.scheduled_flights TO service_role;

ALTER TABLE public.scheduled_flights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled flights"
  ON public.scheduled_flights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS scheduled_flights_user_date_idx
  ON public.scheduled_flights (user_id, flight_date);
CREATE INDEX IF NOT EXISTS scheduled_flights_user_flight_idx
  ON public.scheduled_flights (user_id, flight_number);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS arion_login text,
  ADD COLUMN IF NOT EXISTS arion_password text,
  ADD COLUMN IF NOT EXISTS arion_station text DEFAULT 'MAD',
  ADD COLUMN IF NOT EXISTS arion_last_sync timestamptz;