-- Air Est: el prefijo de vuelo pasa de "AE" a "AEG" (siglas correctas de la
-- compañía). El número de vuelo se guarda con el prefijo incrustado en el
-- propio string (ver FlightInfoStep: setFlightNumber(prefix + digits)), así que
-- las escalas ya existentes conservaban la numeración antigua y no aparecían al
-- filtrar por la aerolínea.
--
-- Sólo se reemplaza el prefijo inicial, nunca una "AE" en medio del texto.
-- Idempotente: el guard NOT LIKE 'AEG%' evita volver a prefijar si se re-ejecuta.

UPDATE turnarounds
SET flight_number = 'AEG' || substring(flight_number from 3)
WHERE airline = 'AIR_EST'
  AND flight_number LIKE 'AE%'
  AND flight_number NOT LIKE 'AEG%';

-- El vuelo de salida vive dentro del JSONB "times".
-- Nota: en escalas sin número de salida el valor almacenado es sólo el prefijo
-- ("AE" → "AEG"), que es justo lo que renderiza el formulario.
UPDATE turnarounds
SET times = jsonb_set(
      times,
      '{departureFlightNumber}',
      to_jsonb('AEG' || substring(times->>'departureFlightNumber' from 3))
    )
WHERE airline = 'AIR_EST'
  AND times->>'departureFlightNumber' LIKE 'AE%'
  AND times->>'departureFlightNumber' NOT LIKE 'AEG%';
