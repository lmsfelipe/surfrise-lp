// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";

const publicDir = new URL("./public/", import.meta.url);

/**
 * `{ "/prints/01-home.webp": "<hash do conteúdo>", … }` para as imagens de
 * public/ que têm cache de 1 ano em public/_headers. Elas não levam hash no
 * nome e já foram trocadas no lugar, então a URL ganha ?v=<hash> (ver
 * src/data/assets.ts). Muda a imagem, muda a URL.
 */
function publicAssetVersions() {
  const files = [
    ...readdirSync(new URL("prints/", publicDir)).map((f) => `/prints/${f}`),
    ...readdirSync(new URL("brand/", publicDir)).map((f) => `/brand/${f}`),
    "/hero-tall.webp",
    "/hero-wide.webp",
  ];
  return Object.fromEntries(
    files.map((f) => [
      f,
      createHash("sha256").update(readFileSync(new URL(f.slice(1), publicDir))).digest("hex").slice(0, 10),
    ]),
  );
}

export default defineConfig({
  site: "https://surfrise.com.br",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    define: {
      __PUBLIC_ASSET_VERSIONS__: JSON.stringify(publicAssetVersions()),
    },
    build: {
      // three.js is a single big chunk by design; it is loaded on idle, never on the critical path.
      chunkSizeWarningLimit: 600,
    },
  },
  // Uma página só: o CSS inteiro cabe no HTML e economiza o round trip que
  // bloqueava a primeira pintura (o Lighthouse media ~885 ms nele).
  build: { inlineStylesheets: "always" },
});
