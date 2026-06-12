## Arreglo del botón "Actualizar aplicación"

Modificar `src/hooks/useAppUpdate.ts` para que `applyUpdate()` fuerce activamente la activación del nuevo Service Worker en lugar de solo recargar (que el SW antiguo intercepta sirviendo HTML cacheado).

### Nuevo flujo de `applyUpdate()`

1. `setUpdating(true)`
2. Re-fetch `/version.json?t=<timestamp>` con `cache: 'no-store'` para confirmar versión remota.
3. `navigator.serviceWorker.getRegistration()` → llamar `reg.update()` para forzar descarga del nuevo SW.
4. Si existe `reg.waiting`: enviar `postMessage({ type: 'SKIP_WAITING' })` y esperar el evento `controllerchange` (timeout ~3s como fallback).
5. Limpiar caches relevantes vía `caches.keys()` filtrando: `workbox-precache-*`, `workbox-runtime-*`, `supabase-api-cache`. No tocar caches de Firebase Messaging ni otros.
6. `window.location.reload()` final.

### Detalles técnicos

- El SW generado por `vite-plugin-pwa` con `generateSW` ya incluye listener por defecto para `{type:'SKIP_WAITING'}` → no requiere cambios en el SW.
- En entorno de preview (donde `registerAppServiceWorker` rechaza) el flujo degrada limpiamente: si no hay SW registrado, salta los pasos 3-5 y recarga directamente.
- Bumpe de versión: `2.0.279` en `src/config/version.ts` y `public/version.json` con changelog: "Corregido el botón Actualizar — ahora fuerza la activación del nuevo Service Worker."

### Archivos modificados

- `src/hooks/useAppUpdate.ts` (única lógica funcional)
- `src/config/version.ts` (bump)
- `public/version.json` (bump)

### NO se toca

- `vite.config.ts`, `src/lib/registerSW.ts`, `public/sw.js`, `public/service-worker.js`
- `UpdateBanner.tsx` (ya llama `applyUpdate` correctamente)
- Firebase Messaging
- Lógica de detección/polling de versión
