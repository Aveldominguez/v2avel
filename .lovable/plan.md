
# Gestión de catálogos desde el Panel de Admin

Objetivo: que un admin pueda crear/editar (con soft-delete e IDs inmutables) aerolíneas, modelos de avión, compartimientos/bodegas, códigos de carga y la configuración de los campos de tiempos. Las reglas especiales por aerolínea (Amazon Ristra, FedEx parking, AirEst W&B, ITA hold style, split layout, push-back, etc.) **siguen en código** sin cambios.

## Qué verá el usuario

Nueva pestaña **"Catálogos"** dentro de `/admin` con 5 sub-secciones:

1. **Aerolíneas** — listar/crear/editar/desactivar. Campos: código interno (inmutable, solo al crear), nombre, nombre corto, color HSL.
2. **Modelos de avión** — agrupados por aerolínea. Campos: código modelo (inmutable), etiqueta, turnaround (min), limpieza (min, opcional).
3. **Bodegas / Compartimientos** — por aerolínea + modelo. Permite añadir compartimientos (nombre, ej. "COMPARTIMIENTO 1 FWD"), reordenar, marcar como bulk/expandable, y dentro de cada uno añadir bodegas simples o pareadas (estilo ITA). IDs de bodega inmutables.
4. **Códigos de carga (Comoditys)** — por aerolínea. Tabla código/significado/orden con activo/inactivo.
5. **Campos de tiempos** — por aerolínea. Lista de los campos existentes (chocksOnArrival, loadingStart…) con: visible sí/no, etiqueta personalizada, orden, color de reloj (verde/rojo/default) y tipo (time/boolean/boolean-text). **No** se pueden inventar campos nuevos.

En cada sección: botón "Guardar cambios", validación inline, soft-delete (toggle "Activo"), y advertencia al editar un código que ya tenga escalas asociadas.

## Compatibilidad con escalas existentes

- Las escalas guardadas siguen funcionando porque:
  - El `airline` y `aircraftModel` se almacenan como strings → si el código interno nunca cambia, todo sigue resolviéndose.
  - Los `fieldValues` usan IDs deterministas (`wizz-bt`) → al editar la etiqueta no rompe nada.
- Soft-delete: marcar inactivo oculta de los selectores nuevos pero respeta lo ya registrado.
- Borrado real: no se permite desde UI (solo soft-delete) para evitar romper históricos.

## Cambios técnicos (detalle)

### Base de datos (nuevas tablas en `public`)

- `catalog_airlines` (code PK text inmutable, name, short_name, color, active, sort_order, updated_at)
- `catalog_aircraft_models` (id uuid, airline_code, model_code text inmutable, label, turnaround_minutes, cleaning_minutes nullable, active, sort_order). Unique(airline_code, model_code).
- `catalog_compartments` (id uuid inmutable, airline_code, aircraft_model_code nullable, name, hold_style, bulk, expandable, expandable_default, sort_order, active)
- `catalog_holds` (id text PK inmutable, compartment_id, label, pair_group nullable, pair_side nullable [left|right], sort_order, active)
- `catalog_load_codes` (id uuid, airline_code, code text inmutable, label, sort_order, active). Unique(airline_code, code).
- `catalog_time_field_overrides` (id uuid, airline_code, field_key text [enum keys de TurnaroundTimes], visible bool, label nullable, clock_color nullable, type nullable, sort_order). Unique(airline_code, field_key).

RLS:
- `SELECT` para `authenticated` (todos los usuarios necesitan leer el catálogo para renderizar formularios).
- `INSERT/UPDATE/DELETE` solo si `has_role(auth.uid(), 'admin')`.
- `service_role` con `ALL`.
- GRANTs explícitos.

Seed inicial vía migración: volcamos los datos actuales de `AIRLINES`, `AIRCRAFT_MODELS`, `compartmentDefinitions.ts`, `fieldDefinitions.ts` para que el primer estado en BD sea idéntico al actual.

### Frontend

- Nuevo hook `useCatalog()` (basado en React Query) que carga todos los catálogos en una sola consulta cacheada (`staleTime: 5 min`, `initialData` desde `localStorage` para no degradar el arranque rápido recién implementado).
- Refactor de `src/data/aircraftModels.ts`, `compartmentDefinitions.ts`, `fieldDefinitions.ts` y `AIRLINES` en `types/turnaround.ts`: en vez de exportar constantes, exportan funciones que consultan el catálogo. Mantenemos los **defaults hardcodeados como fallback** si el catálogo aún no cargó (red lenta / primera vez offline).
- Las funciones que dependen de reglas especiales (`getTimeFieldsForAirline`, `usesSplitLayout`, `AIRLINES_WITH_STAIRS`, AirEst W&B, Amazon Ristra) **siguen igual**: solo cambian la fuente de los nombres/etiquetas/visibilidad, no la lógica.
- Nueva página `src/pages/admin/CatalogManager.tsx` con tabs internos para las 5 secciones. Reutiliza shadcn `Table`, `Dialog`, `Switch`, `Input`. Mismo look industrial que el resto.
- En `AdminPanel.tsx`, añadir botón/sección "Gestionar catálogos" que abre la nueva página o un Dialog ancho.

### Edge functions

- No hace falta nueva edge function: el CRUD se hace por RLS desde el cliente con la sesión de admin.

### Reglas que **NO** se tocan

- `usesSplitLayout`, `AIRLINES_WITH_STAIRS`, `ARRIVAL_ONLY_KEYS`, `DEPARTURE_ONLY_KEYS`, lógica de `gpuOn`, `pushBack`, `parkingArrival`, Amazon Ristras, ITA hold style, AirEst Weight & Balance, lookups de aviationstack.

## Plan de implementación por fases

```text
1. Migración SQL: 6 tablas + GRANTs + RLS + seed con datos actuales.
2. Hook useCatalog + refactor de getters en data/* para leer del catálogo con fallback hardcodeado.
3. Página CatalogManager con 5 tabs (Aerolíneas, Modelos, Bodegas, Comoditys, Campos de tiempos).
4. Entrada desde AdminPanel + verificación visual.
5. Versión + changelog (bump APP_VERSION).
```

## Lo que queda fuera (lo confirmas si quieres añadirlo después)

- Crear/editar reglas especiales (split layout, has-stairs, push-back) desde admin → siguen en código.
- Inventar campos de tiempo nuevos → no permitido, solo configurar los existentes.
- Importar/exportar catálogos como JSON.
- Multi-idioma de etiquetas.

¿Procedo así?
