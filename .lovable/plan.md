## Objetivo
Incluir los datos del escáner de Air Canada (descarga = arrival, carga = departure) en el PDF exportado. Los datos ya se persisten en `ac_load_sheet_data` y `ac_bulk_data`, solo falta leerlos y renderizarlos al generar el PDF.

## Cambios

### 1. `src/utils/generateTurnaroundPdf.ts`
- Aceptar `flightDate` y (opcional) `flightNumber` ya vienen. Añadir consulta a Supabase cuando `data.airline === 'AIR_CANADA' | 'AIR_CANADA_CARGO'`:
  - `ac_load_sheet_data` filtrado por `flight_number` + `flight_date`.
  - `ac_bulk_data` filtrado igual.
- Agrupar filas por `scan_type` (`arrival` / `departure`) y `fwd_section` (FWD / AFT).
- Renderizar dos bloques nuevos: **"Descarga (Arrival)"** y **"Carga (Departure)"**, cada uno con:
  - Sub-tabla FWD y AFT con columnas: Posición, Contenedor, Peso (kg), Piezas, %, Notas, Orden manual (si tiene), Puerta.
  - Fila resumen BULK con contadores: BF, BY, DOM, USA, INT, BG, RUSH (solo los > 0).
- Insertar los bloques después de `Horarios Programados` y antes de `Control de Horas` (o donde encaje mejor visualmente, decisión menor).
- Si no hay filas para una sección, se omite; si no hay ninguna, no se muestra el encabezado.

### 2. `src/pages/TurnaroundForm.tsx`
- No requiere cambios funcionales: ya pasa `flightNumber` y `date` a `generateTurnaroundPdf`. Solo verificar que `flightDate` en formato `yyyy-MM-dd` esté disponible al llamar (usar `format(date, 'yyyy-MM-dd')` si hace falta).

### 3. Persistencia
- No requiere cambios: `AirCanadaCargoScanner` ya guarda posiciones (con debounce 800 ms) y contadores BULK en Supabase, y los recarga al abrir el vuelo. RLS existentes se mantienen.

## Fuera de alcance
- Bodegas de FedEx/Amazon (no son módulo de escáner y ya están en `times.bodegasData`).
- Cambios visuales en el propio componente scanner.

## Verificación
- Abrir un vuelo AC con datos escaneados → pulsar "Exportar PDF" → confirmar que aparecen las secciones Descarga y Carga con FWD/AFT y BULK.
- Vuelo AC sin datos → las secciones no aparecen.
- Vuelo de otra aerolínea → PDF sin cambios.
