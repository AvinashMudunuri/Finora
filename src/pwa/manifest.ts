export type FinoraWebManifestIcon = {
  src: string;
  sizes: string;
  type: "image/png";
  purpose?: "any" | "maskable" | "any maskable";
};

export type FinoraWebManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: "standalone";
  background_color: string;
  theme_color: string;
  icons: FinoraWebManifestIcon[];
};

export const finoraWebManifest: FinoraWebManifest = {
  name: "Finora",
  short_name: "Finora",
  description: "Your financial life, clearly connected.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#FFFFFF",
  theme_color: "#0B1B34",
  icons: [
    {
      src: "pwa-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
    {
      src: "pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};
