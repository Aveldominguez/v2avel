## Problema

La edge function `flight-lookup` está enviando el parámetro equivocado a la API de Flightradar24, por eso TO4632 (y cualquier otro vuelo) siempre devuelve "Vuelo no encontrado".

En los logs aparece literalmente:

```
FR24 .../live/flight-positions/full → 400:
"None of the required fields were provided.
 Please include at least one of the following:
 bounds / flights / callsigns / registrations / painted_as / operating_as ..."

FR24 .../historic/flight-events/full → 400:
"The flight ids field is required., The event types field is required."
```

El código envía `?flight_iata=TO4632`, pero la API de FR24 no acepta ese campo:

- `live/flight-positions/full` necesita `flights=TO4632` (o `callsigns=...`).
- `historic/flight-events/full` requiere `flight_ids` + `event_types`, que no tenemos hasta haber resuelto antes el vuelo, por lo que no sirve como fallback directo.

## Cambios

### `supabase/functions/flight-lookup/index.ts`

1. Cambiar el parámetro de la llamada live: usar `flights=<NUMERO>` en lugar de `flight_iata=...`.
2. Reemplazar el fallback histórico por endpoints que sí aceptan número de vuelo:
   - `historic/flight-positions/full` con `flights=<NUMERO>` + `timestamp` reciente (últimos 7 días).
   - Como segundo fallback, `flight-summary/light` con `flights=<NUMERO>` y rango de fechas, que devuelve aerolínea, modelo y matrícula incluso de vuelos ya aterrizados.
3. Normalizar correctamente la respuesta (los campos reales que devuelve FR24 son `painted_as`, `operating_as`, `type`, `reg`, `flight`, etc., que ya están contemplados pero los rutas `aircraft.model` no existen en la respuesta real).
4. Loguear el JSON crudo (recortado) cuando `found = false` para poder depurar futuros vuelos no encontrados.
5. Mantener el contrato actual con el cliente: la función sigue recibiendo `{ flight_iata }` y devolviendo `{ found, airline_iata, airline_name, aircraft_model, aircraft_registration }`, así que **no hay cambios** en `useFlightLookup.ts` ni en `FlightInfoStep.tsx`.

### Versionado

Subir `APP_VERSION` a `2.0.271` en `src/config/version.ts` y `public/version.json`.

## Lo que NO se toca

- Lógica del formulario, validaciones, autocompletado UI.
- `useFlightLookup.ts` ni el mapeo IATA→modelo en `FlightInfoStep.tsx`.
- Reglas `FLIGHT_NUMBER_RULES` ni los iconos de estado.
- Políticas RLS ni storage.

## Verificación

Tras desplegar, probar de nuevo con `TO4632`:
- Si está en el aire → entra por live, devuelve `TO / Transavia / 737 / matrícula`.
- Si ya aterrizó hoy → entra por `flight-summary` y devuelve los mismos datos.
- Revisar `supabase--edge_function_logs flight-lookup` para confirmar respuesta `200` y JSON con datos.
