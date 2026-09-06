import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { finoraWebManifest } from "./src/pwa/manifest.ts";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: finoraWebManifest,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
