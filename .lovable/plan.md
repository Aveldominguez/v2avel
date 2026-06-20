## Diagnóstico

En `supabase/functions/sync-arion-flights/index.ts` el header `X-Station` está fijado a **`LEMD`** (código ICAO de Madrid) tanto en el login como en las llamadas autenticadas:

```ts
// línea 29
const ARION_HEADERS_BASE = {
  ...
  'X-Station': 'LEMD',
};
```

Tienes razón en que ARION suele esperar el **código IATA** (`MAD`) y no el ICAO (`LEMD`). Si la estación no coincide con la que el usuario tiene asignada en ARION, el login devuelve 401 aunque las credenciales sean correctas — que es justo el síntoma que vemos.

## Plan

1. **Cambiar `X-Station` de `LEMD` a `MAD`** en `ARION_HEADERS_BASE` (línea 29). Eso aplica automáticamente al login y a todas las llamadas posteriores (lista de vuelos, detalle, telex), porque todas hacen spread de `ARION_HEADERS_BASE`.

2. **Mantener el resto del flujo intacto** (logging, fallback de `username`/`login`, manejo de errores controlado a 200).

3. **Desplegar** `sync-arion-flights` y disparar un sync manual desde el Admin Panel.

4. **Revisar logs** de la Edge Function:
   - Si el login devuelve 200 → problema resuelto, ARION aceptó `MAD`.
   - Si sigue 401 con el mismo cuerpo de error → las credenciales realmente están mal y hay que re-guardarlas.
   - Si devuelve otro error (p.ej. "station not allowed") → sabremos que la cuenta no tiene permiso sobre MAD y habrá que pedir alta.

## Nota

Si en el futuro hay que operar más de una base, conviene mover `X-Station` a una columna en `arion_config` (p.ej. `station_code text default 'MAD'`) en lugar de hard-codearlo. Pero eso lo dejamos para una segunda iteración una vez confirmemos que `MAD` desbloquea el login.
