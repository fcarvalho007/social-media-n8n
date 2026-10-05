import { ALTURA, LARGURA, type Camada, type CamadaTexto, type PacoteProva, type Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

export const PASSO_FONTE = 4;
export const TAM_MIN = 6;
export const TAM_MAX = 400;
export const PRESETS_TAMANHO = [24, 32, 40, 48, 56, 64, 72, 88, 104, 128];

/** One click on +/−: changes only the selected text layer, never others. */
export function tamanhoMais(c: CamadaTexto, sinal: 1 | -1): number {
  return Math.min(TAM_MAX, Math.max(TAM_MIN, Math.round(c.estilo.tam + sinal * PASSO_FONTE)));
}

/** Role of a text layer, used by «Aplicar a todos»: same role across pages gets the style. */
export function papel(c: Camada): string {
  if (c.tipo === "texto") return c.ref ? (c.ref.endsWith(".titulo") ? "titulo" : "texto") : c.id === "num" ? "num" : "livre";
  if (c.tipo === "forma") return `forma:${c.forma}:${c.nome ?? ""}`;
  return "imagem";
}

/**
 * Explicit «Aplicar a todos»: copies font family, weight and colour (text) or colour (shape) from the selected
 * layer to layers with the same role on every page of the current variant. Size and position are never copied,
 * so fitting is not silently changed. Returns null when nothing changes.
 */
export function aplicarATodos(p: PacoteProva, v: Variante, origem: Camada): { pacote: PacoteProva; alteradas: number } | null {
  const alvo = papel(origem);
  let alteradas = 0;
  const paginas = p.variantes[v].paginas.map((pg) => ({
    ...pg,
    camadas: pg.camadas.map((c) => {
      if (c.id === origem.id || papel(c) !== alvo) return c;
      if (c.tipo === "texto" && origem.tipo === "texto") {
        const e = { ...c.estilo, familia: origem.estilo.familia, peso: origem.estilo.peso, cor: origem.estilo.cor };
        if (e.familia === c.estilo.familia && e.peso === c.estilo.peso && e.cor === c.estilo.cor) return c;
        alteradas++;
        return { ...c, estilo: e };
      }
      if (c.tipo === "forma" && origem.tipo === "forma" && c.estilo.cor !== origem.estilo.cor) {
        alteradas++;
        return { ...c, estilo: { ...c.estilo, cor: origem.estilo.cor } };
      }
      return c;
    }),
  }));
  if (!alteradas) return null;
  return { pacote: { ...p, variantes: { ...p.variantes, [v]: { ...p.variantes[v], paginas } } }, alteradas };
}

/** Explicit: background colour of the current page copied to every page of the variant. */
export function fundoATodos(p: PacoteProva, v: Variante, cor: string): PacoteProva | null {
  if (p.variantes[v].paginas.every((pg) => pg.fundo === cor)) return null;
  return { ...p, variantes: { ...p.variantes, [v]: { ...p.variantes[v], paginas: p.variantes[v].paginas.map((pg) => ({ ...pg, fundo: cor })) } } };
}

export type Alinhar = "esq" | "centroH" | "dir" | "topo" | "centroV" | "base";
/** Align a layer to the page (canonical 1080×1350). */
export function alinharNaPagina(c: Camada, a: Alinhar): Partial<Camada> {
  switch (a) {
    case "esq": return { x: 0 };
    case "centroH": return { x: Math.round((LARGURA - c.w) / 2) };
    case "dir": return { x: LARGURA - c.w };
    case "topo": return { y: 0 };
    case "centroV": return { y: Math.round((ALTURA - c.h) / 2) };
    case "base": return { y: ALTURA - c.h };
  }
}

export const LIMIAR_SNAP = 10;
/**
 * Snap a dragged box to page edges/centre and to other layers' edges/centres (doc units).
 * Returns the snapped position and the guide lines to draw.
 */
export function encaixar(x: number, y: number, w: number, h: number, outras: Camada[], limiar = LIMIAR_SNAP): { x: number; y: number; guiasX: number[]; guiasY: number[] } {
  const alvosX = [0, LARGURA / 2, LARGURA, ...outras.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
  const alvosY = [0, ALTURA / 2, ALTURA, ...outras.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
  const melhor = (pos: number, tam: number, alvos: number[]) => {
    let r: { d: number; novo: number; guia: number } | null = null;
    for (const [k, off] of [[0, 0], [1, tam / 2], [2, tam]] as const) {
      void k;
      for (const a of alvos) {
        const d = Math.abs(pos + off - a);
        if (d <= limiar && (!r || d < r.d)) r = { d, novo: a - off, guia: a };
      }
    }
    return r;
  };
  const mx = melhor(x, w, alvosX);
  const my = melhor(y, h, alvosY);
  return { x: mx ? Math.round(mx.novo) : x, y: my ? Math.round(my.novo) : y, guiasX: mx ? [mx.guia] : [], guiasY: my ? [my.guia] : [] };
}
