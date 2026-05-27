## Objetivo
Reducir el tiempo desde que abres la app hasta que puedes empezar una nueva escala. Hoy, al entrar en `/`, se descargan **todas** tus escalas con `SELECT *` (incluyendo `times` y `field_values` en JSONB, que pueden ser grandes) antes de mostrar la pantalla. Este es el cuello de botella principal.

## Estrategia
Atacar 3 frentes: (1) datos — cargar menos y más tarde, (2) navegación — permitir crear escala sin esperar a la lista, (3) bundle — pequeñas mejoras de arranque.

---

## 1. Datos: paginación + columnas ligeras (mayor impacto)

**Cambios en `useTurnarounds` / `TurnaroundList`:**
- Cargar inicialmente solo las **últimas 3 escalas** en lugar de todas. `PAGE_SIZE` pasa de 10 a **3**.
- Seleccionar solo las columnas necesarias para el listado: `id, flight_number, date, airline, observations, times, created_at, updated_at`. Hoy `select('*')` trae también `field_values` (JSON grande con valores/fotos) que **no se usa en la lista**.
- Cuando el usuario filtra por fecha/aerolínea/búsqueda, hacer la consulta en el servidor (`eq`, `ilike`) en vez de filtrar en memoria.
- Botón "Cargar más Escalas" hace una nueva query con `range(offset, offset + 3)` en lugar de paginar en memoria. Así, al abrir, solo se descargan 3 filas pequeñas.

**Resultado esperado:** primera pantalla útil con una sola query mínima (3 filas, sin `field_values`).

## 2. Navegación: arrancar sin esperar la lista

- En `App.tsx`, la ruta `/` no bloquea con `<FullScreenLoader />`: se muestra el header y el botón **"Nueva Escala"** al instante, y solo se pone skeleton en la tarjeta de resultados.
- **Prefetch** del módulo `/turnaround/new` en cuanto se monta `TurnaroundList` (`import()` anticipado) para que abrir el formulario sea instantáneo.
- El botón "Nueva Escala" queda activo incluso mientras la lista de 3 está cargando.

## 3. Caché entre sesiones con React Query

`@tanstack/react-query` ya está instalado pero `useTurnarounds` usa `useState/useEffect`. Migrarlo a `useQuery` con:
- `staleTime: 30s` para no refetch al volver del detalle.
- `initialData` desde `localStorage` (stale-while-revalidate) → la **segunda apertura** del día muestra las 3 últimas escalas al instante.

## 4. Bundle y arranque

- Verificar que `IncidentReportDialog`, `generateTurnaroundPdf`, `html2canvas`, `jspdf`, `jszip`, `html5-qrcode` no se importen en el path crítico de `TurnaroundList` (lazy donde falte).
- Diferir el primer check de `useAppUpdate` (polling 3 min) con `requestIdleCallback` para no competir con la primera query.
- `AuthProvider`: usar la sesión cacheada de `localStorage` para disparar la query de escalas sin esperar a `getSession()`.

## 5. Backend (opcional, recomendado)

- Asegurar índice `turnarounds(user_id, date DESC, created_at DESC)` para que la query paginada sea instantánea aunque crezca el histórico.

---

## Archivos a tocar

```text
src/hooks/useTurnarounds.ts       → paginación servidor + select reducido + react-query
src/pages/TurnaroundList.tsx      → PAGE_SIZE=3, filtros en servidor, skeleton no bloqueante, prefetch /new
src/App.tsx                       → no bloquear ruta / con FullScreenLoader
src/hooks/useAuth.tsx             → exponer session inicial sin esperar getSession
src/hooks/useAppUpdate.ts         → diferir primer check con requestIdleCallback
supabase/migrations/...           → índice (user_id, date desc, created_at desc) si no existe
```

## Pregunta para ti
¿Aplico **todo el paquete** (máximo impacto) o solo **pasos 1 + 2** (paginación de 3 + botón "Nueva Escala" sin esperar), que ya da la mayor parte de la mejora con menos cambios?
