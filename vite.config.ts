import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";


const VERSION_FILE = path.resolve(__dirname, 'src/config/version.ts');
const VERSION_JSON_FILE = path.resolve(__dirname, 'public/version.json');
// Accepts both `major.minor` (e.g. '3.0') and legacy `major.minor.patch` (e.g. '2.0.281')
const VERSION_REGEX = /APP_VERSION\s*=\s*'(\d+)\.(\d+)(?:\.(\d+))?'/;
const CHANGELOG_REGEX = /APP_CHANGELOG:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/;

function readVersionSource() {
  const source = fs.readFileSync(VERSION_FILE, 'utf-8');
  const versionMatch = source.match(VERSION_REGEX);

  if (!versionMatch) {
    throw new Error('APP_VERSION no encontrado en src/config/version.ts');
  }

  const changelogMatch = source.match(CHANGELOG_REGEX);
  const changelog = changelogMatch?.[1].match(/'([^']+)'/g)?.map((entry) => entry.replace(/'/g, '')) ?? [];

  const major = Number(versionMatch[1]);
  const minor = Number(versionMatch[2]);

  return {
    source,
    version: `${major}.${minor}`,
    major,
    minor,
    changelog,
  };
}

function writeVersionFiles(version: string, source: string, changelog: string[]) {
  const nextSource = source.replace(/APP_VERSION\s*=\s*'[^']+'/, `APP_VERSION = '${version}'`);
  fs.writeFileSync(VERSION_FILE, nextSource, 'utf-8');
  fs.writeFileSync(VERSION_JSON_FILE, `${JSON.stringify({ version, changelog }, null, 2)}\n`, 'utf-8');
}

function syncVersionFiles(increment: boolean) {
  const { source, version, major, minor, changelog } = readVersionSource();
  // Each increment bumps the minor by 1 (v3.0 → v3.1 → v3.2 ...)
  const nextVersion = increment ? `${major}.${minor + 1}` : version;
  writeVersionFiles(nextVersion, source, changelog);
}

function syncAppVersion() {
  const trackedRoot = path.resolve(__dirname, 'src');
  const ignoredFiles = new Set([VERSION_FILE, VERSION_JSON_FILE]);
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleIncrement = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncVersionFiles(true);
    }, 200);
  };

  return {
    name: 'sync-app-version',
    buildStart() {
      syncVersionFiles(false);
    },
    configureServer(server: import('vite').ViteDevServer) {
      const handleTrackedChange = (file: string) => {
        const resolvedFile = path.resolve(file);
        if (ignoredFiles.has(resolvedFile) || !resolvedFile.startsWith(trackedRoot)) return;
        scheduleIncrement();
      };

      server.watcher.on('add', handleTrackedChange);
      server.watcher.on('change', handleTrackedChange);
      server.watcher.on('unlink', handleTrackedChange);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          /*
           * El ayudante de carga diferida de Vite es un módulo sintético y,
           * si no se le dice dónde va, Rollup lo mete donde le cuadra. Acabó
           * dentro del fichero del PDF, y como el arranque necesita el
           * ayudante, el arranque se traía los 612 KB del PDF aunque ya nadie
           * lo importara de forma directa. Se fija junto a React, que es el
           * único que siempre se carga.
           */
          if (id.includes('preload-helper')) return 'react';
          if (!id.includes('node_modules')) return;
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'pdf';
          if (id.includes('jszip')) return 'jszip';
          if (id.includes('html5-qrcode')) return 'qrcode';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('react-day-picker') || id.includes('date-fns')) return 'dates';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) return 'react';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    react(),
    syncAppVersion(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      devOptions: { enabled: false },
      includeAssets: ['favicon.ico', 'favicon.jpeg', 'robots.txt', 'icons/*.png'],
      filename: 'sw.js',
      workbox: {
        /*
         * Lo que se guarda de antemano es el armazón: lo que hace falta para
         * que la app arranque y se pueda trabajar sin cobertura.
         *
         * Fuera quedan las pantallas de administración y sus librerías
         * (catálogos, copias de seguridad, gráficas), que se usan sentado y
         * con wifi. Antes se guardaban 45 ficheros y 4,3 MB, y el móvil se
         * los traía ENTEROS en cada actualización, compitiendo con lo que
         * estuvieras haciendo.
         *
         * El PDF y el lector de códigos SÍ se siguen guardando aunque ya no
         * se carguen al arrancar: son de plataforma y tienen que funcionar
         * sin cobertura. Que no se carguen de inicio y que estén guardados
         * son dos cosas distintas, y aquí interesan las dos.
         */
        globPatterns: ['**/*.{css,html,ico,png,jpeg,svg,woff2}', 'assets/*.js'],
        globIgnores: [
          'assets/AdminPanel-*.js',
          'assets/CatalogManager-*.js',
          'assets/jszip-*.js',
          'assets/charts-*.js',
        ],
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            // La comprobación de conectividad lleva `_probe` y NO se cachea: si
            // se respondiera desde la caché, diríamos que hay servidor justo
            // cuando no lo hay. Ver src/lib/backendReachability.ts.
            urlPattern: ({ url }) =>
              url.hostname.includes('supabase.co') && !url.searchParams.has('_probe'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              /*
               * Metro y medio, no cinco.
               *
               * La app guarda copia local de casi todo (sesión, permisos,
               * escalas, catálogo), así que tirar de ella es barato. Con
               * cinco segundos, al volver a la app con la cobertura todavía
               * reconectándose —entrando en la terminal, por ejemplo— cada
               * consulta se quedaba esperando ese tiempo antes de rendirse,
               * y en el arranque hay varias seguidas.
               */
              networkTimeoutSeconds: 1.5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 2 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Lo excluido del precache (administración) se guarda al usarlo:
            // así la primera visita necesita red, pero las siguientes no.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-bajo-demanda',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      manifest: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
