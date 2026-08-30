-- Sala y cinta de entrega de equipaje.
--
-- ARION lo publica en `secondaryGateNumber` del detalle del vuelo, como una
-- letra y tres cifras ("N617"): la primera cifra es la sala y las dos últimas
-- la cinta. Se guarda el valor TAL CUAL, sin partir: si el formato cambia, se
-- corrige la lectura en la app sin tener que resincronizar el histórico.
--
-- Va como columna de scheduled_flights y no como tabla aparte: es un dato más
-- del vuelo, con su misma vida y su misma clave. Una tabla nueva obligaría a
-- un cruce en cada consulta sin aportar nada.
ALTER TABLE public.scheduled_flights
  ADD COLUMN IF NOT EXISTS baggage_belt text;

COMMENT ON COLUMN public.scheduled_flights.baggage_belt IS
  'secondaryGateNumber de ARION, sin procesar (p. ej. "N617"): sala = 1ª cifra, cinta = 2 últimas.';
