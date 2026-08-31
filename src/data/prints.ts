/**
 * Os prints do app só aparecem dentro de mockups de celular: 210 px de largura
 * na esteira da seção 07 e 306 px no maior deles. Duas larguras cobrem tudo —
 * 424w para telas pequenas (232 px em DPR 1,75) e 706w para retina no desktop.
 * Os dois arquivos saem de scripts/build-assets.mjs.
 */
export const PRINT_SIZES = "(min-width: 1000px) 306px, 240px";

/** `/prints/01-home.webp` → `/prints/01-home-424.webp 424w, /prints/01-home.webp 706w` */
export function printSrcSet(src: string) {
  return `${src.replace(/\.webp$/, "-424.webp")} 424w, ${src} 706w`;
}
