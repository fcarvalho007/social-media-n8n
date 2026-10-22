/** Owner rule: carousels start at 10 slides; 8 is the usual alternative. */
export const SLIDES_PREDEFINIDOS = 10;
export const SLIDES_ALTERNATIVA = 8;

/** Whether a curated news item carries only title/summary and should try the full article from its link. */
export function precisaArtigoCompleto(c: { nivel?: string; texto: string; url: string | null }): boolean {
  return !!c.url && /^https?:\/\//i.test(c.url) && (c.nivel === "resumo" || c.texto.trim().length < 1200);
}
