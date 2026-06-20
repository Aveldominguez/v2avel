## Problema

La edge function `change-password` devuelve un genérico `"Error al cambiar contraseña"` con status 400, ocultando el motivo real (en este caso `weak_password` / `pwned` de HIBP). El frontend tampoco propaga el detalle, por eso solo se ve *"Edge Function returned a non-2xx status code"*.

## Solución (Opción A)

Mantener activa la protección HIBP y mostrar el mensaje real, más añadir un medidor de fortaleza con sugerencias accionables al admin mientras escribe.

### 1. `supabase/functions/change-password/index.ts`
- En el `catch` del `updateUserById`, devolver el mensaje real de Supabase y mapear los códigos conocidos a texto en español:
  - `weak_password` con `reasons: ["pwned"]` → "Esta contraseña aparece en filtraciones conocidas. Elige otra distinta."
  - `weak_password` genérico → "Contraseña demasiado débil. Usa mayúsculas, números y símbolos."
  - resto → el `error.message` original.
- Devolver también `code` y `reasons` en el JSON para que el cliente pueda reaccionar.

### 2. `src/hooks/useAdmin.ts` — `changePassword`
- Cuando `supabase.functions.invoke` devuelve error, leer el body de respuesta (`error.context.response`) para extraer `error` real en lugar de quedarse con el genérico `"non-2xx status code"`. Lanzar `new Error(mensajeReal)`.

### 3. `src/pages/AdminPanel.tsx` — diálogo "Cambiar contraseña"
Añadir debajo del input un **indicador de fortaleza** en vivo con barra de color y lista de checks:

```
[████████░░] Fuerte
✓ Al menos 8 caracteres
✓ Una mayúscula
✗ Un número      ← sugerencia: añade un número
✗ Un símbolo (!@#$…)
```

Reglas:
- Mínimo 8 caracteres (subir desde 6 para alinear con HIBP y la edge function que ya valida >= 8).
- Una minúscula, una mayúscula, un número, un símbolo.
- Puntuación 0–5 → etiqueta: Muy débil / Débil / Aceptable / Buena / Fuerte.
- Color de la barra: rojo → ámbar → verde según puntuación.
- El botón "Cambiar Contraseña" se mantiene deshabilitado hasta cumplir las 4 reglas mínimas (no solo longitud), para que casi nunca llegue una contraseña débil al servidor.
- Añadir botón "Generar contraseña segura" que crea una de 14 caracteres con los 4 tipos garantizados y la rellena en el input (se puede copiar/mostrar con un toggle ojo).

### 4. Sin cambios de seguridad
- No se desactiva HIBP.
- No se tocan RLS, secrets ni migraciones.

## Detalles técnicos

- El medidor vive como un pequeño componente local en `AdminPanel.tsx` (o `src/components/admin/PasswordStrength.tsx` si crece). Sin dependencias nuevas — lógica con regex.
- El toggle mostrar/ocultar usa los iconos `Eye` / `EyeOff` de `lucide-react` (ya disponibles en el bundle).
- El generador usa `crypto.getRandomValues` para aleatoriedad criptográfica.

## Archivos modificados

- `supabase/functions/change-password/index.ts`
- `src/hooks/useAdmin.ts`
- `src/pages/AdminPanel.tsx`
- `public/version.json` + `src/config/version.ts` (bump menor)
