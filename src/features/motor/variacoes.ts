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
  /** Variant the suggestion was computed for and the only one it changes. */
  variante: Variante;
  /** One entry per page of that variant, in order (null ritmo = capa/fecho/manual page kept as is). */
  plano: Array<{ pagina: number; ritmo: Ritmo | null; composicao: ComposicaoId | null; muda: boolean; comImagem: boolean }>;
  /** Pattern break near the middle (contrast composition), or null when no slide qualifies/fits. */
  quebra: { pagina: number; motivo: string } | null;
}

/**
 * Index of the slide for a pattern break near the middle: an interior slide (not capa/fecho), closest
 * to the middle, preferring short slides (a contrast block suits one strong line). Deterministic.
 */
export function slideQuebra(slides: SlideRitmo[]): number | null {
  const meio = (slides.length - 1) / 2;
  const cand = slides.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && i < slides.length - 1 && s.papel !== "capa" && s.papel !== "fecho");
  if (!cand.length) return null;
  const peso = ({ s, i }: { s: SlideRitmo; i: number }) => Math.abs(i - meio) * 100 + Math.min(99, Math.round((s.titulo.length + s.texto.length) / 10));
  return cand.sort((a, b) => peso(a) - peso(b))[0].i;
}

/**
 * Suggests a visual rhythm for an existing carousel from the slide roles and the source paragraphs
 * they cite. Deterministic, no AI; capa/fecho and pages without editorial text stay unchanged.
 */
export function sugerirRitmo(pacote: PacoteProva, slides: Array<SlideRitmo & { id: string }>, paragrafos: string[], m?: Medidor, variante: Variante = "A"): SugestaoRitmo {
  const plano = planoRitmo(slides, paragrafos);
  const iq = slideQuebra(slides);
  let motivo = "";
  if (iq != null && plano[iq]) {
    // A data slide keeps the typographic emphasis on its number; others get the contrast block.
    const c: ComposicaoId = plano[iq].ritmo === "dado_chave" ? "tipografico" : "contraste";
    const viz = [plano[iq - 1]?.composicao, plano[iq + 1]?.composicao];
    plano[iq] = { ...plano[iq], composicao: viz.includes(c) ? (c === "contraste" ? "tipografico" : "contraste") : c };
    motivo = plano[iq].ritmo === "dado_chave" ? "dado em destaque tipográfico" : "bloco de contraste para quebrar o padrão";
  }
  const porSlide = new Map(slides.map((s, i) => [s.id, plano[i]]));
  let out = pacote;
  // Only the active variant changes; the other variant object is returned untouched.
  for (const v of [variante]) {
    for (const p of pacote.variantes[v].paginas) {
      const sid = slideDaPagina(p);
      const c = sid ? porSlide.get(sid)?.composicao : null;
      // Pages with images keep their layout: compositions place text by role and could cover the image.
      if (!c || p.camadas.some((k) => k.tipo === "imagem")) continue;
      const o = comporPagina(p, c, pacote.conteudo, m);
      if (o && o.cabe) out = comPagina(out, v, o.pagina);
    }
  }
  let quebra: SugestaoRitmo["quebra"] = null;
  if (iq != null) {
    const pi = pacote.variantes[variante].paginas.findIndex((p) => slideDaPagina(p) === slides[iq].id);
    if (pi >= 0 && out.variantes[variante].paginas[pi] !== pacote.variantes[variante].paginas[pi]) quebra = { pagina: pi, motivo };
  }
  return {
    pacote: out,
    quebra,
    variante,
    plano: pacote.variantes[variante].paginas.map((p, i) => {
      const sid = slideDaPagina(p);
      const e = sid ? porSlide.get(sid) : undefined;
      return { pagina: i, ritmo: e?.ritmo ?? null, composicao: e?.composicao ?? null, muda: out.variantes[variante].paginas[i] !== p, comImagem: p.camadas.some((k) => k.tipo === "imagem") };
    }),
  };
}
