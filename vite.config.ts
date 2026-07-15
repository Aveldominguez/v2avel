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
        globPatterns: ['**/*.{js,css,html,ico,png,jpeg,svg,woff2}'],
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 2 },
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
