/**
 * Único lugar para ajustar links e datas da campanha.
 */
export const site = {
  /** Destino real do botão "Quero analisar meu surf". */
  ctaUrl: "https://app.surfrise.com.br/",
  /** Data em que o beta gratuito termina — aparece na seção de acesso e no CTA final. */
  betaUntil: "30 de outubro",
  instagram: "https://instagram.com/surfrise.app",
  contactEmail: "surfrise.app@gmail.com",
  /**
   * Pixel/dataset ID do Meta Ads (Events Manager → Connect Data Sources → Web).
   * Pixel "Surfrise Website Pixel" criado em business.facebook.com.
   */
  metaPixelId: "1428121946081158",
} as const;
