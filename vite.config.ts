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
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    syncAppVersion(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.jpeg", "icons/*.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpeg,jpg,woff2}"],
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
