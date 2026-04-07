import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

function autoIncrementVersion() {
  return {
    name: 'auto-increment-version',
    buildStart() {
      const versionFile = path.resolve(__dirname, 'src/config/version.ts');
      const content = fs.readFileSync(versionFile, 'utf-8');
      const match = content.match(/APP_VERSION\s*=\s*'(\d+)\.(\d+)\.(\d+)'/);
      if (match) {
        const major = match[1];
        const minor = match[2];
        const patch = parseInt(match[3]) + 1;
        const newVersion = `${major}.${minor}.${patch}`;
        const newContent = content.replace(
          /APP_VERSION\s*=\s*'[^']+'/,
          `APP_VERSION = '${newVersion}'`
        );
        fs.writeFileSync(versionFile, newContent, 'utf-8');
      }
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
    mode === "production" && autoIncrementVersion(),
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
