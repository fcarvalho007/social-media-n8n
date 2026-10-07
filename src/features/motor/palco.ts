export const PAGINA = { w: 1080, h: 1350 } as const;
export const PALCO_MAX = 420;
export function medidasPalco(larguraContentor: number, dimensoes: { largura: number; altura: number } = { largura: PAGINA.w, altura: PAGINA.h }): { w: number; h: number; escala: number } {
  const w = Math.max(0, Math.floor(Math.min(larguraContentor, PALCO_MAX)));
  const escala = w / dimensoes.largura;
  return { w, h: Math.round(dimensoes.altura * escala), escala };
}
