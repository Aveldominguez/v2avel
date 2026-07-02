WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY flight_number, flight_date, movement_type, sdt
           ORDER BY synced_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.scheduled_flights
)
DELETE FROM public.scheduled_flights sf
USING ranked r
WHERE sf.id = r.id AND r.rn > 1;

ALTER TABLE public.scheduled_flights DROP CONSTRAINT IF EXISTS uq_flight_date_number_movement;
ALTER TABLE public.scheduled_flights ADD CONSTRAINT uq_flight_date_number_movement_sdt UNIQUE (flight_number, flight_date, movement_type, sdt);