# v2avel

Aplicación PWA de gestión de escalas (turnarounds) y equipos de rampa para operaciones de handling aeroportuario. Optimizada para móvil, con modo offline, sincronización de vuelos desde ARION (Aviapartner) y escáner de hojas de carga.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (PWA con vite-plugin-pwa)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions + pg_cron)
- **Hosting:** Cloudflare Pages

## Desarrollo local

```sh
npm install
cp .env.example .env   # rellena con las claves de tu proyecto Supabase
npm run dev            # http://localhost:8080
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (genera `dist/`) |
| `npm run lint` | ESLint |
| `npm test` | Tests (Vitest) |

## Estructura

- `src/pages/` — rutas principales (Rampa, Equipos, Admin)
- `src/components/` — componentes por módulo + `ui/` (shadcn)
- `src/hooks/` — lógica de datos (auth, offline sync, ARION, catálogos)
- `supabase/functions/` — edge functions (sync ARION, escáner de hojas de carga, gestión de usuarios)
- `supabase/migrations/` — migraciones SQL

## Despliegue

Cloudflare Pages construye automáticamente desde `main` (`npm run build`, directorio `dist`). Las variables `VITE_*` se configuran en el panel de Pages.
