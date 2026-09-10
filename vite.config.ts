import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { finoraWebManifest } from "./src/pwa/manifest.ts";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icon.svg",
        "apple-touch-icon.png",
        "finora-icon-192.png",
        "finora-icon-512.png",
        "finora-maskable-512.png",
        "brand/finora-f-mark.svg",
        "brand/finora-logo.svg",
        "brand/finora-pwa-maskable.svg",
        "brand/finora-f-mark.png",
        "brand/finora-wordmark.png",
        "brand/finora-pwa-maskable.png",
      ],
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
