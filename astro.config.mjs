// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://surfrise.com.br",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // three.js is a single big chunk by design; it is loaded on idle, never on the critical path.
      chunkSizeWarningLimit: 600,
    },
  },
  // Uma página só: o CSS inteiro cabe no HTML e economiza o round trip que
  // bloqueava a primeira pintura (o Lighthouse media ~885 ms nele).
  build: { inlineStylesheets: "always" },
});
