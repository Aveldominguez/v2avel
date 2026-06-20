ALTER TABLE public.scheduled_flights
  ADD COLUMN IF NOT EXISTS scheduled_arrival_time text,
  ADD COLUMN IF NOT EXISTS scheduled_departure_time text;