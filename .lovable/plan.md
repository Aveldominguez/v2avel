## Problema

La API devolvió `airline_iata: "TRA"` (en realidad es el **ICAO** de Transavia France, no su IATA `TO`) y `aircraft_model: "B738"`. Resultado:

- `matchAirlineCode("TRA")` no encuentra nada en `AIRLINE_IATA_MAP` → `airlineCode = null` → no se rellena aerolínea.
- En `FlightInfoStep.applyLookupResult`, el modelo solo se rellena si existe en `getModelsForAirline(targetAirline)`. Como `airline` quedó vacío, `currentModels` está vacío → tampoco se rellena el modelo, aunque `B738` sí está en `IATA_TO_MODEL`.

Por eso solo se rellenó la matrícula.

## Cambios

### `src/hooks/useFlightLookup.ts`
1. Añadir `AIRLINE_ICAO_MAP` con los códigos ICAO de las aerolíneas operadas (TRA→TRANSAVIA, TAP→TAP, WZZ→WIZZ, ITY→ITA, AEE→AEGEAN, PGT→PEGASUS, TVF→TRANSAVIA, SEH→SKYEXPRESS, FDX→FEDEX, ACA→AIR_CANADA, WJA→WESTJET, LAV→ALBASTAR, ICE→ICELANDAIR, AZU→AZUL, KKK→A_JET, NIA→NILE_AIR, EWG→EUROWINGS, CTN→CROATIA, SQP→SKYUP, GTI/PAC→AMAZON).
2. En `matchAirlineCode`, si `iata` tiene 3 letras (es decir, viene un ICAO), probar primero `AIRLINE_ICAO_MAP` antes del IATA.
3. **Fallback por prefijo del vuelo**: si el matching anterior falla, extraer la(s) letra(s) iniciales del `flightIata` consultado y reutilizar `AIRLINE_IATA_MAP` (p. ej. `TO4632` → `TO` → `TRANSAVIA`). Esto cubre cualquier caso futuro en el que FR24 devuelva un código no mapeado.
4. Pasar `flightIata` a `matchAirlineCode` para el fallback.

### `src/components/turnaround/FlightInfoStep.tsx`
Sin cambios funcionales: en cuanto `airlineCode` venga relleno, `currentModels` se calcula bien y `B738` → `737-800` se aplicará automáticamente.

### Versionado
Subir `APP_VERSION` a `2.0.273` en `src/config/version.ts` y `public/version.json`.

## Lo que NO se toca
- Edge function `flight-lookup` (ya funciona).
- Lógica del formulario, validaciones, autocompletado UI.
- `IATA_TO_MODEL`, `FLIGHT_NUMBER_RULES`, datos de aerolíneas.

## Verificación
Probar TO4632 de nuevo: debe rellenar Transavia + 737-800 + matrícula.
