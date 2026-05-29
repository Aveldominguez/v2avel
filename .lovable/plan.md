## Objetivo

Hacer que la app sea más rápida y estable en iPhone: que cargue antes, no entre en pantalla blanca al volver de otras apps y que los datos introducidos en una escala se mantengan aunque haya lapsos de cobertura.

## Qué modificaría

1. **Quitar dependencias críticas de red al arrancar**
   - Evitar que la app espere consultas online para decidir acceso a módulos o catálogo si ya hay datos cacheados.
   - Usar caché local como primera fuente y refrescar en segundo plano.
   - Reducir timeouts silenciosos para que una petición colgada no deje loaders indefinidos.

2. **Cambiar la estrategia PWA para priorizar estabilidad**
   - Desactivar Service Worker en el entorno de preview/iframe para que no cachee rutas de desarrollo ni módulos TypeScript.
   - Ajustar la navegación para no servir un `index.html` incompatible con chunks no disponibles.
   - Evitar borrados agresivos de cachés durante “Actualizar”, porque pueden dejar la app sin recursos si coincide con poca cobertura.

3. **Eliminar pantalla blanca por imports dinámicos**
   - Convertir las rutas críticas de trabajo (`Auth`, `TurnaroundList`, `TurnaroundForm`) en imports directos o precargados de forma robusta.
   - Mantener lazy-loading solo para pantallas secundarias pesadas como admin, PDF, QR o catálogos.
   - Ampliar el Error Boundary para errores generales de render, no solo chunks, mostrando botón “Reintentar” en vez de blanco.

4. **Guardar datos introducidos con más seguridad**
   - Guardar borrador local de la escala de forma inmediata y también en `pagehide`, `visibilitychange` y `beforeunload`, no solo por debounce.
   - Guardar al pasar la app a segundo plano antes de que iOS suspenda la WebView.
   - Mantener el borrador incluso después de guardado online hasta confirmar navegación/estado estable.

5. **Mejorar cola offline y sincronización**
   - Tratar `navigator.onLine` como señal orientativa, no como verdad absoluta: si una petición falla, guardar local y encolar sin bloquear.
   - Reintentar sincronización cuando vuelva visibilidad, foco o conexión, pero sin bloquear la UI.
   - Evitar toasts de éxito innecesarios para respetar la regla del proyecto de no distraer.

6. **Optimizar carga y fluidez de la lista/formulario**
   - Aumentar caché útil de escalas locales y renderizar primero lo local.
   - Mover precargas y sincronizaciones masivas a segundo plano con menor prioridad.
   - Evitar trabajo pesado al abrir la pantalla de Control de Horas.

7. **Subir versión y changelog**
   - Actualizar `APP_VERSION` y `public/version.json` con una nota clara: estabilidad iPhone, guardado seguro y fluidez con cobertura intermitente.

## Resultado esperado

- La app no dependerá de tener cobertura perfecta para seguir trabajando en una escala ya abierta.
- Si iOS mata o congela la app, al volver debería recuperar el formulario/borrador en vez de quedarse en blanco.
- La navegación principal y Control de Horas cargarán más rápido porque las rutas críticas no dependerán de chunks descargados en el momento.
- Los cortes momentáneos de internet no deberían provocar pérdida de datos introducidos.

## Detalles técnicos

Archivos principales a tocar:
- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/components/ChunkErrorBoundary.tsx`
- `src/lib/lazyWithRetry.ts`
- `src/lib/pwaResume.ts`
- `src/hooks/useAuth.tsx`
- `src/hooks/useModuleAccess.tsx`
- `src/hooks/useCatalog.ts`
- `src/hooks/useTurnarounds.ts`
- `src/hooks/useOfflineSync.ts`
- `src/pages/TurnaroundForm.tsx`
- `src/pages/TurnaroundList.tsx`
- `src/config/version.ts`
- `public/version.json`