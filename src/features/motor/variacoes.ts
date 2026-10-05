// Per-slide compositions and visual-rhythm suggestions for the Design step. Pure (tested); nothing is
// saved here — callers hand the resulting package to the existing versioned save.
import type { PacoteProva, Pagina, Variante, Medidor } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { comporPagina, planoRitmo, type ComposicaoId, type Ritmo, type SlideRitmo } from "../../../supabase/functions/_shared/motor/composicoes";

/** Slide id behind a page, read from its editorial text refs ("<slideId>.titulo"). */
export function slideDaPagina(p: Pagina): string | null {
  for (const c of p.camadas) if (c.tipo === "texto" && c.ref) return c.ref.split(".")[0] ?? null;
  return null;
}

function comPagina(pacote: PacoteProva, v: Variante, pagina: Pagina): PacoteProva {
  const doc = pacote.variantes[v];
  return { ...pacote, variantes: { ...pacote.variantes, [v]: { ...doc, paginas: doc.paginas.map((p) => (p.id === pagina.id ? pagina : p)) } } };
}

/** Preview package with one page replaced (other pages and the other variant untouched). */
export function previaPagina(pacote: PacoteProva, v: Variante, pagina: Pagina): PacoteProva {
  return comPagina(pacote, v, pagina);
}

/**
 * Applies a composition to the page of `slideId` in the chosen variants. A variant whose page does not
 * fit (text would overflow at its current size) is skipped and reported — never silently shrunk.
 */
export function aplicarComposicaoSlide(pacote: PacoteProva, slideId: string, id: ComposicaoId, variantes: Variante[], m?: Medidor):
  { pacote: PacoteProva; aplicadas: Variante[]; recusadas: Variante[] } {
  let out = pacote;
  const aplicadas: Variante[] = [], recusadas: Variante[] = [];
  for (const v of variantes) {
    const pg = out.variantes[v].paginas.find((p) => slideDaPagina(p) === slideId);
    const o = pg && comporPagina(pg, id, pacote.conteudo, m);
    if (!o || !o.cabe) { recusadas.push(v); continue; }
    out = comPagina(out, v, o.pagina);
    aplicadas.push(v);
  }
  return { pacote: out, aplicadas, recusadas };
}

export interface SugestaoRitmo {
  pacote: PacoteProva;
  /** One entry per page of variant A, in order (null ritmo = capa/fecho/manual page kept as is). */
  plano: Array<{ pagina: number; ritmo: Ritmo | null; composicao: ComposicaoId | null; muda: boolean }>;
}

/**
 * Suggests a visual rhythm for an existing carousel from the slide roles and the source paragraphs
 * they cite. Deterministic, no AI; capa/fecho and pages without editorial text stay unchanged.
 */
export function sugerirRitmo(pacote: PacoteProva, slides: Array<SlideRitmo & { id: string }>, paragrafos: string[], m?: Medidor): SugestaoRitmo {
  const plano = planoRitmo(slides, paragrafos);
  const porSlide = new Map(slides.map((s, i) => [s.id, plano[i]]));
  let out = pacote;
  for (const v of ["A", "B"] as const) {
    for (const p of pacote.variantes[v].paginas) {
      const sid = slideDaPagina(p);
      const c = sid ? porSlide.get(sid)?.composicao : null;
      if (!c) continue;
      const o = comporPagina(p, c, pacote.conteudo, m);
      if (o && o.cabe) out = comPagina(out, v, o.pagina);
    }
  }
  return {
    pacote: out,
    plano: pacote.variantes.A.paginas.map((p, i) => {
      const sid = slideDaPagina(p);
      const e = sid ? porSlide.get(sid) : undefined;
      return { pagina: i, ritmo: e?.ritmo ?? null, composicao: e?.composicao ?? null, muda: out.variantes.A.paginas[i] !== p };
    }),
  };
}
