## Diagnóstico

Cuando iOS suspende una PWA en standalone (cambias de app o vas al escritorio) el WebView se mata. Al volver, iOS **recarga** la app desde `start_url = "/"`. Ahí se cruzan tres cosas que están provocando la pantalla en blanco:

1. **El Service Worker se auto-actualiza con `skipWaiting: true` + `clientsClaim: true`.**  
   Si había un SW nuevo en espera, en la recarga activa una `index.html` nueva que apunta a chunks con hash distinto (`index-XYZ.js`, `react-XYZ.js`, …). Esos chunks no están en la caché todavía → `import()` falla → `<Suspense>` queda colgado / React lanza error → pantalla en blanco.

2. **`navigateFallback` + `NetworkFirst` para HTML.**  
   Al volver online, Workbox sirve la `index.html` fresca aunque los chunks viejos sigan en caché y los nuevos aún no estén descargados.

3. **No hay Error Boundary alrededor del `<Suspense>` con rutas lazy.**  
   Cualquier error al cargar un chunk dinámico burbujea hasta el root y deja la pantalla en blanco sin recuperación.

A esto se suma un bug conocido de iOS: a veces la PWA en standalone vuelve a un WebView "muerto" y necesita un `reload()` para volver a renderizar.

## Cambios

### 1. Service Worker estable (`vite.config.ts`)

- Quitar `skipWaiting: true` y `clientsClaim: true`. Las actualizaciones siguen llegando, pero **solo se aplican cuando el usuario pulsa "Actualizar ahora"** (que ya hace `postMessage SKIP_WAITING + reload`).
- Cambiar la estrategia de navegación de `NetworkFirst` a **`CacheFirst` con revalidación en background** (`StaleWhileRevalidate`) para que el HTML servido siempre case con los chunks ya cacheados.
- Mantener `cleanupOutdatedCaches: true` y el resto del runtimeCaching.

Resultado: al volver del background, el SW no cambia debajo de los pies → la `index.html` cacheada coincide con los chunks cacheados → no hay "chunk load failure".

### 2. Error Boundary con recuperación automática (`src/components/ChunkErrorBoundary.tsx`, nuevo)

- Envolver `<AppRoutes />` en App.tsx con un Error Boundary que detecte errores típicos de chunks (`ChunkLoadError`, `Failed to fetch dynamically imported module`, `Importing a module script failed`).
- Cuando detecte uno: pone un flag `chunk-reload-attempt` en `sessionStorage` y hace `window.location.reload()`. Si el flag ya está puesto (segundo intento) muestra un fallback con botón "Reintentar" en lugar de bucle.

### 3. Recuperación al volver del background (`src/main.tsx` o nuevo `src/lib/pwaResume.ts`)

Registrar dos listeners globales antes de montar React:

- `pageshow`: si `event.persisted === true` (back-forward cache de iOS), forzar `location.reload()` una sola vez por sesión.
- `visibilitychange`: si la pestaña vuelve a `visible` después de **> 10 minutos** oculta y `document.body` está vacío o React no respondió en 1500 ms, hacer `location.reload()`.

Esto cubre el caso iOS de WebView congelado.

### 4. Imports lazy con reintento (`src/App.tsx`)

Reemplazar cada `lazy(() => import(...))` por un helper `lazyWithRetry()` que:

- Intenta el import.
- Si falla con error de chunk, espera 300 ms y reintenta una vez.
- Si vuelve a fallar, lanza para que lo capture el Error Boundary.

Esto evita pantallazo en blanco por un fallo transitorio de red al hidratar un chunk justo al despertar.

### 5. Bump de versión

- `src/config/version.ts` y `public/version.json` a la siguiente patch.
- Changelog: "Arreglo: pantalla en blanco al volver a la app desde otra aplicación o el escritorio en iPhone."

## Lo que NO se toca

- Auth (ya hidrata sesión sincrónicamente desde localStorage).
- Lógica de turnarounds / sync offline (ya funciona).
- Manifest y `start_url` (ya están bien para PWA instalada).
- Botón / icono de WiFi amarillo de offline (sin cambios).

## Notas técnicas

- Quitar `skipWaiting + clientsClaim` **no rompe** el flujo de actualización: el botón "Actualizar ahora" del header sigue forzando la activación. Solo evitamos activaciones automáticas durante una recarga de iOS.
- El cambio a `StaleWhileRevalidate` para `request.mode === "navigate"` mantiene la app instantánea offline y descarga la nueva versión en segundo plano sin romper la sesión actual.
- El Error Boundary usa `sessionStorage` (no `localStorage`) para que el flag se limpie al cerrar la pestaña y no quede pegado.
