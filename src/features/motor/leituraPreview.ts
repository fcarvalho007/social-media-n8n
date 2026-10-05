// Preview-only geometry for «Ver como será lido». Never written to layers nor used by exports.
import type { PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

export const PAG_W = 1080;
export const PAG_H = 1350;

export type Formato = "4:5" | "3:4" | "1:1";
export interface Rect { x: number; y: number; w: number; h: number }

/** Central crop of the 1080×1350 page for a target aspect (simulation only). */
export function recorteCentral(f: Formato): Rect {
  if (f === "4:5") return { x: 0, y: 0, w: PAG_W, h: PAG_H };
  const [a, b] = f === "3:4" ? [3, 4] : [1, 1];
  // Fit the largest a:b rect inside the page, centred.
  const w = Math.min(PAG_W, (PAG_H * a) / b);
  const h = Math.min(PAG_H, (PAG_W * b) / a);
  return { x: (PAG_W - w) / 2, y: (PAG_H - h) / 2, w, h };
}

/** Bounding box of the text layers actually on the page, or null without text. */
export function caixaTexto(pacote: PacoteProva, v: Variante, i: number): Rect | null {
  const t = pacote.variantes[v].paginas[i]?.camadas.filter((c) => c.tipo === "texto") ?? [];
  if (!t.length) return null;
  const x = Math.min(...t.map((c) => c.x)), y = Math.min(...t.map((c) => c.y));
  const x2 = Math.max(...t.map((c) => c.x + c.w)), y2 = Math.max(...t.map((c) => c.y + c.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

/** Smallest distance from the text box to each page edge (real geometry, px of the 1080 canvas). */
export function recuos(r: Rect) {
  return { topo: Math.round(r.y), dir: Math.round(PAG_W - r.x - r.w), base: Math.round(PAG_H - r.y - r.h), esq: Math.round(r.x) };
}

/** Pages whose text box falls partly outside a central crop. */
export function paginasCortadas(pacote: PacoteProva, v: Variante, f: Formato): number[] {
  const c = recorteCentral(f);
  return pacote.variantes[v].paginas.flatMap((_, i) => {
    const r = caixaTexto(pacote, v, i);
    if (!r) return [];
    const fora = r.x < c.x - 0.5 || r.y < c.y - 0.5 || r.x + r.w > c.x + c.w + 0.5 || r.y + r.h > c.y + c.h + 0.5;
    return fora ? [i] : [];
  });
}

/** Real title sequence (by page order) with alt-text status per slide. */
export function sequenciaTitulos(pacote: PacoteProva, v: Variante, alt: string[] = []) {
  const ordem = pacote.conteudo.slides.map((s) => s.id);
  return pacote.variantes[v].paginas.map((p, i) => {
    const s = pacote.conteudo.slides.find((x) => x.id === p.slide);
    const k = s ? ordem.indexOf(s.id) : -1;
    return { pagina: i, titulo: s?.titulo?.trim() || "(sem título)", altPreenchido: k >= 0 ? Boolean(alt[k]?.trim()) : false };
  });
}
