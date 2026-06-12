## Problema

El botón LDM solo aparece en `FlightInfoStep` (pantalla inicial de "Nueva Escala"). Una vez creada la escala, esa pantalla desaparece y el formulario principal ("Control de Horas") no muestra el LDM en ningún sitio. Por eso EW9510 ya guardado no tiene botón.

## Solución

Mover/duplicar el botón LDM al header del formulario principal (`src/pages/TurnaroundForm.tsx`), donde ya se muestra el vuelo, ruta, matrícula, etc. El LDM se lee directamente de `scheduled_flights.ldm_raw` cruzando por `flight_number + flight_date`.

## Cambios

### `src/pages/TurnaroundForm.tsx`

1. Añadir estado `const [ldmRaw, setLdmRaw] = useState<string | null>(null);` y `const [showLdm, setShowLdm] = useState(false);`.
2. Extender el `useEffect` existente (líneas 79-106) que ya consulta `scheduled_flights`: añadir `ldm_raw` al `.select(...)` y guardar `setLdmRaw((arrival as any)?.ldm_raw ?? null);`. Así cubre tanto creación como edición de escalas existentes.
3. En el bottom row del header (líneas 603-653), añadir un botón LDM al final de la fila — solo visible cuando `ldmRaw` no es null:
   ```tsx
   {ldmRaw && (
     <>
       <span>|</span>
       <Button
         variant="outline"
         size="sm"
         className="h-7 text-xs font-mono border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
         onClick={() => setShowLdm(true)}
       >
         LDM
       </Button>
     </>
   )}
   ```
4. Añadir el `Dialog` al final del JSX (mismo formato que el de FlightInfoStep):
   - Título: `LDM · {flightNumber}`
   - `<pre>` monospace con `whitespace-pre-wrap` mostrando `ldmRaw` tal cual.
5. Imports: añadir `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` desde `@/components/ui/dialog`.

### `src/components/turnaround/FlightInfoStep.tsx`

Sin cambios. El botón actual sigue funcionando en la pantalla "Nueva Escala" para el caso recién buscado.

### Bump de versión

`public/version.json` y `src/config/version.ts` → `3.25` con changelog "LDM accesible también desde el control de horas".

## No cambiar

- Edge function `sync-arion-flights` (ya guarda `ldm_raw` correctamente).
- Esquema de base de datos (columna `ldm_raw` ya existe).
- Lógica de autofill, cross-link arrival→departure, ni ningún otro componente.
