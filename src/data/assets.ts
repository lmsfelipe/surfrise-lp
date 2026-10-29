declare const __PUBLIC_ASSET_VERSIONS__: Record<string, string>;

/**
 * `/prints/01-home.webp` → `/prints/01-home.webp?v=<hash do conteúdo>`.
 *
 * public/_headers dá cache de 1 ano (immutable) para /prints, /brand e os
 * pôsteres da hero. Como esses arquivos não têm hash no nome e são trocados
 * no lugar quando o app muda, toda referência a eles tem que passar por aqui
 * — senão quem já visitou fica com a imagem antiga por até um ano. O hash é
 * calculado no astro.config.mjs (reinicie o dev server ao trocar imagens).
 */
export function asset(path: string) {
  const v = __PUBLIC_ASSET_VERSIONS__[path];
  return v ? `${path}?v=${v}` : path;
}
