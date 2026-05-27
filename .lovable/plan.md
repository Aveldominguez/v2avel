## Objetivo

Unificar la app **Control Equipos** dentro de v2avel como un segundo módulo, con permisos por usuario (Rampa, Equipos o ambos), compartiendo el catálogo de equipos entre los dos módulos y permitiendo edición del estado desde ambos lados con reglas claras.

## Supuestos (avísame si quieres cambiar alguno)

- **Backend único**: migramos las tablas de Control Equipos al backend de v2avel (más simple, una sola sesión y realtime nativo).
- **Permisos**: cada usuario puede tener una o ambas áreas marcadas. Admin siempre tiene ambas. Si tiene solo una, va directo a ella; si tiene ambas, ve un selector de módulo tras login.
- **Equipo "Cargando" en Rampa**: aparece en el desplegable etiquetado `⚡ Cargando` y seleccionable, pero el operario de Rampa NO puede quitarle el flag de carga. Si está disponible, puede actualizar parking (ubicación) y batería desde el propio desplegable de Rampa.
- **Catálogo**: el catálogo hardcodeado de `equipmentDefinitions.ts` (Rampa) y el de `useEquipmentStore.ts` (Control Equipos) se fusionan en una única fuente en BD (`catalog_equipment_categories` + `catalog_equipment_units`), administrable.

## Cambios

### 1. Base de datos (nueva migración)

Nuevas tablas en v2avel:

- `catalog_equipment_categories` — id, name, icon, sort_order, active.
- `catalog_equipment_units` — id, category_id, code, label, fuel_type (`battery` | `fuel`), is_separator, sort_order, active.
- `equipment_state` — uno por unidad: parking, battery_level, is_charging, charging_since, is_broken, updated_by, updated_at.
- `equipment_activity_log` — historial (user_id, username, action, unit_id, field, old, new, timestamp).
- `user_module_access` — `user_id`, `module` (`rampa` | `equipos`), unique(user_id, module). Admin asume ambas vía `has_role`.

Todas con GRANTs y RLS:
- Lectura autenticada en catálogo + equipment_state.
- Escritura en equipment_state: cualquier autenticado con acceso a `rampa` o `equipos` (validado en RLS vía función `has_module_access`).
- Catálogo y categorías: solo admin escribe.
- Realtime activado en `equipment_state`.

Seed inicial migrando los datos hardcodeados actuales (las 10 categorías y todas las unidades de Control Equipos).

### 2. Permisos y enrutamiento

- Hook nuevo `useModuleAccess()` devuelve `{ rampa, equipos, loading }`.
- `App.tsx`: tras login, ruta `/` decide:
  - solo rampa → `/rampa` (la actual `TurnaroundList`).
  - solo equipos → `/equipos`.
  - ambas o admin → `/select` (pantalla simple con 2 tarjetas).
- Guards por módulo en cada ruta. Sin acceso → redirect al módulo permitido o `/select`.
- En el panel admin, formulario "Crear usuario" añade dos checkboxes: **Acceso a Rampa** / **Acceso a Equipos** (al menos uno requerido). Edge function `create-user` se actualiza para insertar en `user_module_access`.
- Tabla de usuarios del admin: columna con los módulos asignados y edición inline.

### 3. Módulo Control Equipos integrado

- Portamos `HomePage`, `CategoryPage`, `EquipmentRow`, `ChargingButton`, `PriorityBadge` desde el proyecto Control Equipos a `src/pages/equipos/` y `src/components/equipos/`.
- Sustituimos su store local por un hook que lee de las nuevas tablas (`useEquipmentCatalog`, `useEquipmentState`) con realtime.
- Adaptamos estilos al sistema de tokens dark-mode de v2avel (no clases de color crudas).
- Rutas: `/equipos`, `/equipos/:categoryId`.

### 4. Desplegable "Equipos utilizados" en Rampa

- `EquipmentSection.tsx` pasa a leer categorías/unidades de `useEquipmentCatalog` (BD) en vez de `equipmentDefinitions.ts`. Se mantienen las reglas de visibilidad por aerolínea/modelo/remoto.
- Cada `<SelectItem>` muestra:
  - Si **disponible**: código + (batería si la tiene).
  - Si **cargando**: código + `⚡ Cargando` + tiempo cargando. Seleccionable.
  - Si **averiado**: código + `🔧` y deshabilitado.
- Al seleccionar una unidad, debajo del select aparecen 2 inputs compactos:
  - **Parking** (editable siempre que la unidad no esté cargando).
  - **Batería %** (editable solo si `fuel_type='battery'` y NO está cargando).
- Estos cambios escriben directo en `equipment_state` (realtime, todos los ven al instante). Si la unidad está cargando, ambos campos están en read-only con tooltip "Equipo cargando — no editable desde Rampa".
- El operario de Rampa nunca puede togglear `is_charging` ni `is_broken` desde aquí (solo desde Control Equipos).

### 5. Panel de administración — gestión de equipos

Nueva pestaña **Equipos** en `CatalogManager`:

- **Categorías**:
  - Lista con drag-to-reorder.
  - Botón "Añadir categoría" → diálogo con nombre, icono (selector lucide), orden.
  - Editar nombre/icono inline.
  - Toggle activo / eliminar (con confirmación; bloqueado si tiene unidades).
- **Unidades** (dentro de cada categoría, expandible):
  - Tabla con columnas: código, etiqueta, **tipo combustible** (selector `battery` / `fuel`), separador (toggle), orden, activo.
  - Botón "Añadir equipo" en cada categoría.
  - Editar todos los campos inline; eliminar con confirmación.
  - Botón "Guardar cambios" arriba (consistente con el resto del panel).

### 6. Versionado y limpieza

- Bump versión a `2.0.187` con changelog: "Integrado módulo Control Equipos, permisos por usuario, catálogo de equipos editable desde admin".
- Eliminamos `src/data/equipmentDefinitions.ts` solo después de migrar usos (se mantiene como fallback durante un release si es necesario).

## Detalles técnicos

- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE equipment_state;`
- Función `public.has_module_access(_user uuid, _module text)` SECURITY DEFINER que devuelve `true` si admin o si existe fila en `user_module_access`.
- Edge function `create-user` actualizada para aceptar `modules: string[]` y persistirlos.
- Activity log: el escribir desde Rampa registra `source='rampa'` para auditoría.

## Lo que NO se toca

- Lógica de turnarounds, PDF, horas, bodegas: intactas.
- Estructura de auth existente (signIn/signUp): se mantiene; solo añadimos la capa de acceso por módulo.

## Preguntas abiertas que conviene cerrar antes de implementar

1. ¿Confirmas backend unificado y permisos múltiples como en los supuestos?
2. ¿La pantalla de selección de módulo (cuando el usuario tiene ambas) debe recordarse para próximos logins o se muestra siempre?
