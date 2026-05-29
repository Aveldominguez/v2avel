## Problema

Cuando el iPhone está en modo avión, Safari muestra:

> Error: "FetchEvent.respondWith received an error: TypeError: Load failed"

Eso significa que el **service worker** (PWA) intenta resolver la petición de navegación, su `fetch` falla porque no hay red, y **lanza un error en vez de devolver la versión cacheada** del `index.html`. Resultado: la app no abre offline.

La causa raíz está en `vite.config.ts`, en el bloque `VitePWA → workbox`:

- Hay un `runtimeCaching` con `urlPattern: request.mode === "navigate"` usando `NetworkFirst`. Este handler intercepta **antes** que el `navigateFallback`, y cuando la red falla y la URL exacta no está en el cache `app-shell` (caso típico la primera vez que abres offline una ruta como `/equipos` o `/rampa/...`), la promesa se rechaza → "Load failed".
- Las llamadas a Supabase (`*.supabase.co`) no tienen handler, así que offline también lanzan `TypeError: Load failed`, lo que reventaba flujos de carga inicial.
- La cola offline (`useOfflineSync`) ya existe para `turnarounds`, pero solo se procesa cuando vuelve la conexión y solo cubre ese flujo, no Equipos.

## Qué voy a cambiar

### 1. Service worker: navegación offline siempre resuelve

En `vite.config.ts` dentro del bloque `workbox`:

- **Eliminar** el `runtimeCaching` que captura `request.mode === "navigate"` con `NetworkFirst`.
- Mantener `navigateFallback: "/index.html"` y añadir `navigateFallbackAllowlist: [/^\/(?!~oauth|api\/).*/]`. Así, ante cualquier navegación sin red, Workbox sirve el `index.html` precacheado y la SPA arranca offline en cualquier ruta.
- Asegurar que `index.html` está en el precache (ya lo está vía `globPatterns: ["**/*.html", ...]`).
- Añadir un handler `NetworkOnly` con `BackgroundSyncPlugin` (o simplemente `NetworkOnly` con `catchHandler`) para `*.supabase.co/rest/...` y `*.supabase.co/auth/...` para que, offline, devuelvan una respuesta JSON vacía controlada en vez de romper la SW. Las escrituras críticas ya se manejan vía la cola en `localStorage`.

### 2. Cola offline más robusta

En `src/hooks/useOfflineSync.ts`:

- Reintentar `processQueue()` también al evento `visibilitychange` (cuando el usuario vuelve a abrir la PWA tras estar offline) además de al volver online.
- Añadir backoff y límite de reintentos por operación para no reintentar para siempre una operación corrupta.

### 3. Soporte offline para Equipos

Los inputs de Parking/Batería en `EquipmentRow.tsx` y `EquipmentSection.tsx` hoy hacen `UPDATE` directo a `equipment_state`. Offline esto rechaza la promesa de Supabase y se pierde el cambio.

- Envolver esos `update`/`upsert` en un helper `enqueueEquipmentWrite(row, patch)` que:
  - Aplica el cambio en memoria/localStorage al instante.
  - Si hay red: hace el `upsert` normal.
  - Si no: lo guarda en una nueva cola `equipment_sync_queue` en `localStorage` y lo procesa al volver online (mismo patrón que `useOfflineSync`).
- Reusar el indicador `<ConnectionStatus />` para Equipos también.

### 4. Indicador visual claro de "modo offline"

- Mostrar un banner discreto fijo cuando `!navigator.onLine` en `App.tsx` (encima del `UpdateBanner`), con texto "Sin conexión — los cambios se guardarán y se sincronizarán al volver online".
- Mantener el badge de "N pendientes" que ya existe.

### 5. Versión + smoke test

- Incrementar versión y añadir entrada de changelog: "Modo offline: la app abre sin conexión y sincroniza al volver online".
- Probar tras el cambio: abrir la app online una vez (para precachear), poner avión, recargar → debería abrir la SPA en la última ruta y dejar editar sin error de Safari.

## Detalle técnico (por si quieres revisar)

```text
vite.config.ts (workbox)
- runtimeCaching:
    [REMOVE]  { urlPattern: request.mode==='navigate', NetworkFirst, app-shell }
    [KEEP]    { script|style|font|worker, CacheFirst, static-assets }
    [KEEP]    { image, CacheFirst, images }
    [ADD]     { url: /supabase\.co\/(rest|auth)\//, NetworkOnly,
                plugins: [BackgroundSyncPlugin('supabase-writes', {maxRetentionTime: 24*60})] }
- navigateFallback: '/index.html'
- navigateFallbackAllowlist: [/^\/(?!~oauth|api\/).*/]
- navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//]
```

```text
src/hooks/useOfflineSync.ts
- processQueue: + retry on visibilitychange + per-op retryCount with cap=10
src/hooks/useEquipmentOfflineQueue.ts (NEW)
- enqueueEquipmentWrite, drainEquipmentQueue
src/components/equipos/EquipmentRow.tsx
src/components/turnaround/EquipmentSection.tsx
- usar enqueueEquipmentWrite en vez de supabase.update directo
src/App.tsx
- <OfflineBanner /> fijo cuando !isOnline
```

¿Le doy luz verde a este plan?