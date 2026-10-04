// Preview size of a 1080x1350 page from the REAL container width (never from the canvas itself).
export const PAGINA = { w: 1080, h: 1350 } as const;
export const PALCO_MAX = 420;

export function medidasPalco(larguraContentor: number): { w: number; h: number; escala: number } {
  const w = Math.max(0, Math.floor(Math.min(larguraContentor, PALCO_MAX)));
  const escala = w / PAGINA.w;
  return { w, h: Math.round(PAGINA.h * escala), escala };
}
