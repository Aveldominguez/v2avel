-- Coordinador de la escala.
--
-- ARION no tiene un campo propio para él: lo publica en `shortRemark` ("Breve
-- comentario") del detalle del vuelo, que es texto libre donde el coordinador
-- escribe su nombre al firmar el walk around. Comprobado en vivo sobre 10
-- vuelos de un día real en MAD: cuatro traían nombre (IGNACIO, DAVID,
-- FEDERICO, SOFIA), cinco venían vacíos y uno traía una referencia que no es
-- un nombre, así que el valor se filtra antes de darlo por bueno.
ALTER TABLE public.scheduled_flights
  ADD COLUMN IF NOT EXISTS coordinator TEXT;

COMMENT ON COLUMN public.scheduled_flights.coordinator IS
  'Nombre del coordinador, tal cual lo escribe ARION en shortRemark del detalle del vuelo.';
