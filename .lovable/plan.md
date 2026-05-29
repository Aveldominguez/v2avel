## Objetivo

Que la app funcione **completamente sin internet**: abrir, autenticar al usuario ya logueado, listar escalas previas, crear una escala nueva y rellenar todas las horas/campos. Cuando vuelva la conexión, todo se sincroniza solo.

## Diagnóstico actual

Hoy la app rompe offline por 3 motivos:

1. **Sesión bloquea la UI**: `useAuth` espera a Supabase; si la red está caída, queda en `loading` y nunca renderiza Rampa/Equipos. La sesión ya está en `localStorage` (`persistSession: true`), pero no se usa de forma optimista.
2. **Las pantallas leen siempre del servidor**: `TurnaroundList` y `TurnaroundForm` llaman a `supabase.from('turnarounds').select(...)`. Offline, la promesa rechaza → pantalla vacía o spinner infinito. El cache `turnaround-list-cache-v1` solo guarda la primera página sin `field_values`, así que abrir una escala existente offline no funciona.
3. **Las escrituras se pierden**: crear/actualizar una escala hace `insert`/`update` directo a Supabase. Si falla, el cambio no se reintenta (solo `useOfflineSync` lo cubre parcialmente; `TurnaroundForm` no lo usa siempre).

## Plan

### 1. Arranque offline garantizado

- En `useAuth`, hidratar `user` y `session` **de forma síncrona** desde `localStorage` (la SDK de Supabase ya guarda `sb-...-auth-token`) antes de llamar a `getSession()`. Si `navigator.onLine === false`, marcar `loading=false` inmediatamente y dejar al usuario entrar.
- En `App.tsx`, no bloquear las rutas con `FullScreenLoader` cuando ya hay `user` en cache.
- `useModuleAccess`: cachear el resultado en `localStorage` por `user.id` y servirlo offline.

### 2. Cache local completo de escalas (lectura offline)

- Crear `src/lib/turnaroundLocalStore.ts` basado en **IndexedDB** (vía `idb-keyval`, ya ligero) con dos stores:
  - `turnarounds` — escala completa (incluyendo `field_values`, `times`, `observations`).
  - `turnarounds_meta` — última sincronización por usuario.
- En `useTurnarounds`:
  - `fetchPage` → primero devuelve lo local filtrado, luego (si online) refresca desde Supabase y reemplaza.
  - `getTurnaroundById` → lee local primero, si online refresca en background.
- Al cargar la app online, sincronizar **todas** las escalas del usuario al store local en background (paginado, 50 por lote) para que estén disponibles offline.

### 3. Crear y editar escalas 100% offline

- `createTurnaround` y `updateTurnaround` en `useTurnarounds`:
  - Generar `id` local con `crypto.randomUUID()` y `_pendingSync: true`.
  - Escribir **siempre** en IndexedDB primero (fuente de verdad UI).
  - Si online: hacer `upsert` a Supabase y marcar `_pendingSync: false`.
  - Si offline: encolar en `turnaround_sync_queue` (localStorage) la operación completa.
- Ampliar `useOfflineSync.processQueue` para procesar también `update` con id local generado, y aceptar el id real devuelto por Supabase al hacer `insert` (remapear referencias locales).
- Disparar `processQueue` en: `online`, `visibilitychange` (volver a la PWA), y cada 30s mientras haya pendientes.

### 4. Control de horas offline

- `TurnaroundForm` ya guarda draft cada 3s en `localStorage` (`saveDraft`). Confirmar que:
  - Al abrir una escala offline, hidrata desde IndexedDB + draft sin tocar la red.
  - Los `TimeInput` no dependen de ninguna llamada a Supabase para escribir (ya es así).
- Pantalla de lista: si offline y la escala tiene `_pendingSync`, mostrar badge "Pendiente sync".

### 5. Service worker — asegurar shell offline

`vite.config.ts` ya está casi bien tras el último cambio. Confirmar:
- `navigateFallback: '/index.html'` ✓
- `globPatterns` incluye `assets/TurnaroundList-*.js`, `assets/TurnaroundForm-*.js`, `assets/EquiposHome-*.js`, `assets/EquiposCategory-*.js`. **Añadir los que falten** para que cualquier ruta abra offline.
- Bloquear `/version.json` con `NetworkOnly` y `catchHandler` que devuelva la versión actual cacheada (para no romper `useAppUpdate` offline).

### 6. UI de estado offline

- Banner fijo cuando `!navigator.onLine`: "Modo sin conexión — los cambios se guardarán y se sincronizarán al volver online".
- Reusar `ConnectionStatus` con contador de pendientes (escalas + equipos).
- Quitar los `toast` de error de red cuando estamos offline (ya esperado).

### 7. Equipos offline

Aprovechar la cola ya pedida en el plan anterior (`useEquipmentOfflineQueue`) para `equipment_state`, mismo patrón: IndexedDB local + cola en localStorage.

### 8. Versión + smoke test

- Subir a `2.0.221` con changelog: "Modo offline completo: abrir app, crear escala y registrar horas sin conexión; sincroniza al volver online".
- Test manual: abrir online una vez → modo avión → recargar → crear escala nueva → rellenar horas → quitar modo avión → confirmar sincronización.

## Detalle técnico

```text
Archivos a crear
  src/lib/turnaroundLocalStore.ts   (IndexedDB wrapper)
  src/hooks/useEquipmentOfflineQueue.ts
  src/components/OfflineBanner.tsx

Archivos a modificar
  src/hooks/useAuth.tsx              (hidratación síncrona, no bloquear offline)
  src/hooks/useModuleAccess.tsx      (cache localStorage)
  src/hooks/useTurnarounds.ts        (IndexedDB-first, cola para writes)
  src/hooks/useOfflineSync.ts        (visibilitychange, retry/backoff, remapeo de ids)
  src/pages/TurnaroundList.tsx       (leer de store local, badge pendiente)
  src/pages/TurnaroundForm.tsx       (id local optimista)
  src/App.tsx                        (OfflineBanner, no bloquear con loader si hay user cache)
  vite.config.ts                     (globPatterns completos, catchHandler version.json)
  src/config/version.ts + public/version.json
```

```text
Flujo create offline
  user submit
    → uuid local + _pendingSync=true
    → IndexedDB put
    → UI navega a /turnaround/<uuid-local>
    → enqueue('create', payload)
  online event
    → processQueue → supabase.insert → recibe id real
    → IndexedDB: borra registro local, inserta con id real
    → actualiza draft key y rutas si la escala está abierta
```

## Dependencias nuevas

- `idb-keyval` (~600 B) para IndexedDB. Alternativa: implementación manual ligera, pero `idb-keyval` ahorra ~80 LOC y es estable.

## Qué NO se incluye

- Subida offline de **fotos/PDF** a Storage (queda fuera de esta iteración; las fotos quedan en `imageBackupStore` local y se suben al volver online — ya existe parcialmente).
- Login inicial offline (si el usuario nunca entró antes en ese dispositivo, no podemos autenticarlo sin red — limitación de Supabase Auth).

¿Le doy luz verde y lo implemento?