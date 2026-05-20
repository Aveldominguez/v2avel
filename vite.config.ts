import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

const VERSION_FILE = path.resolve(__dirname, 'src/config/version.ts');
const VERSION_JSON_FILE = path.resolve(__dirname, 'public/version.json');
const VERSION_REGEX = /APP_VERSION\s*=\s*'(\d+)\.(\d+)\.(\d+)'/;
const CHANGELOG_REGEX = /APP_CHANGELOG:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/;

function readVersionSource() {
  const source = fs.readFileSync(VERSION_FILE, 'utf-8');
  const versionMatch = source.match(VERSION_REGEX);

  if (!versionMatch) {
    throw new Error('APP_VERSION no encontrado en src/config/version.ts');
  }

  const changelogMatch = source.match(CHANGELOG_REGEX);
  const changelog = changelogMatch?.[1].match(/'([^']+)'/g)?.map((entry) => entry.replace(/'/g, '')) ?? [];

  return {
    source,
    version: `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`,
    major: Number(versionMatch[1]),
    minor: Number(versionMatch[2]),
    patch: Number(versionMatch[3]),
    changelog,
  };
}

function writeVersionFiles(version: string, source: string, changelog: string[]) {
  const nextSource = source.replace(/APP_VERSION\s*=\s*'[^']+'/, `APP_VERSION = '${version}'`);
  fs.writeFileSync(VERSION_FILE, nextSource, 'utf-8');
  fs.writeFileSync(VERSION_JSON_FILE, `${JSON.stringify({ version, changelog }, null, 2)}\n`, 'utf-8');
}

function syncVersionFiles(increment: boolean) {
  const { source, version, major, minor, patch, changelog } = readVersionSource();
  const nextVersion = increment ? `${major}.${minor}.${patch + 1}` : version;
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
export default defineConfig(({ mode }) => ({
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
    mode === "development" && componentTagger(),
    syncAppVersion(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.jpeg", "icons/*.png"],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        globPatterns: ["**/*.{css,html,ico,woff2}", "assets/index-*.js", "assets/react-*.js", "assets/supabase-*.js", "assets/radix-*.js", "assets/icons-*.js", "assets/dates-*.js", "assets/TurnaroundList-*.js", "assets/Auth-*.js"],
        globIgnores: ["**/pdf-*.js", "**/qrcode-*.js", "**/jszip-*.js", "**/charts-*.js", "**/index.es-*.js", "**/purify.es-*.js"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // App shell HTML — try network first, fall back to cache when offline
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "app-shell",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Static assets (JS/CSS/fonts) — cache first for instant offline load
            urlPattern: ({ request }) =>
              ["script", "style", "font", "worker"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // Images (icons, photos already loaded) — cache first
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: false, // use public/manifest.json
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
