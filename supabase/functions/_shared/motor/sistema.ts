// Visual system = Style (layout/typography) + Variant (A/B composition of that style) + Palette (colours only).
// Pure and shared: Design previews, Composition and tests call the SAME aplicarSistema, so preview = result.
// Text is never changed; a page that does not fit keeps its normal composition (break) or stays as it was.
import { ALTURA, PARES_FONTES, type Familia, LARGURA, layoutTexto, resolverTexto, type Camada, type CamadaTexto, type ConteudoEditorial, type Medidor, type PacoteProva, type Pagina, type Variante } from "../documento-grafico/nucleo.ts";
import { ESTILOS, type EstiloId, type Paleta } from "./estilos.ts";
import { comporModelo } from "./modelos.ts";
import { aplicarEfeitos, type OverrideEfeitos } from "./efeitos.ts";
import { chaveComposicao, comporImagem, inferirPapel, PAPEIS, type ComposicaoImagem, type ComposicoesImagem, type DecisaoImagem, type PapelVisual } from "./imagem.ts";

export type PaletaId = "navy-editorial" | "navy-digital" | "navy-signal" | "navy-sage" | "navy-ice" | "azul" | "terracota" | "salvia" | "grafite" | "violeta";
export interface PaletaMarca { id: PaletaId; nome: string; sensacao: string; amostras: [string, string, string, string, string]; cores: Paleta }
/** Technical colours available to the engine, not presented as part of the palettes. */
export const BRANCO = "#FFFFFF", PRETO = "#111111";

const pal = (navy: string, fundo: string, acento: string, grafite = "#20252B"): Paleta =>
  ({ fundo, fundoCapa: navy, titulo: navy, texto: grafite, destaque: acento, discreto: "#5F6B76" });

const fam = (fundoCapa: string, fundo: string, titulo: string, texto: string, destaque: string, discreto: string): Paleta => ({ fundo, fundoCapa, titulo, texto, destaque, discreto });
/** Five main colour families with distinct identities (strong background, light background, title, body, accent, secondary). */
export const PALETAS_PRINCIPAIS: readonly PaletaMarca[] = [
  { id: "azul", nome: "Azul / Navy", sensacao: "Confiança / análise", amostras: ["#0E2A47", "#F3F6FA", "#0E2A47", "#2F7DD1", "#5B6B7C"], cores: fam("#0E2A47", "#F3F6FA", "#0E2A47", "#1F2933", "#2F7DD1", "#5B6B7C") },
  { id: "terracota", nome: "Vermelho / Terracota", sensacao: "Energia / opinião", amostras: ["#7A2418", "#FAF3EE", "#3A1A14", "#C2452D", "#7A6158"], cores: fam("#7A2418", "#FAF3EE", "#3A1A14", "#2E211D", "#C2452D", "#7A6158") },
  { id: "salvia", nome: "Verde / Sálvia", sensacao: "Calma / sustentável", amostras: ["#23392D", "#F2F5F0", "#1E3226", "#5E8A6E", "#5F6D63"], cores: fam("#23392D", "#F2F5F0", "#1E3226", "#26302A", "#5E8A6E", "#5F6D63") },
  { id: "grafite", nome: "Neutra / Grafite", sensacao: "Sóbria / intemporal", amostras: ["#1E2124", "#F5F5F3", "#16181A", "#8A6E3B", "#6B6F73"], cores: fam("#1E2124", "#F5F5F3", "#16181A", "#2A2D30", "#8A6E3B", "#6B6F73") },
  { id: "violeta", nome: "Violeta", sensacao: "Criativa / inovação", amostras: ["#2E1F5E", "#F5F3FA", "#241848", "#7A52D1", "#6A6380"], cores: fam("#2E1F5E", "#F5F3FA", "#241848", "#2A2535", "#7A52D1", "#6A6380") },
];
/** Previous navy palettes: still available and used by existing documents. */
export const PALETAS_ANTERIORES: readonly PaletaMarca[] = [
  { id: "navy-editorial", nome: "Navy Editorial", sensacao: "Autoridade / premium", amostras: ["#0B1F33", "#F4F1EA", "#20252B", "#89939B", "#C6A15B"], cores: pal("#0B1F33", "#F4F1EA", "#C6A15B") },
  { id: "navy-digital", nome: "Navy Digital", sensacao: "Tecnologia / IA", amostras: ["#0B1F33", "#F5F8FB", "#3578E5", "#B8D4F0", "#20252B"], cores: pal("#0B1F33", "#F5F8FB", "#3578E5") },
  { id: "navy-signal", nome: "Navy Signal", sensacao: "Conteúdo forte / opinião", amostras: ["#0B1F33", "#F5F2ED", "#E4573D", "#D9D2C8", "#20252B"], cores: pal("#0B1F33", "#F5F2ED", "#E4573D") },
  { id: "navy-sage", nome: "Navy Sage", sensacao: "Sofisticação / calma", amostras: ["#0B1F33", "#F1F3EF", "#708779", "#C8D0C8", "#20252B"], cores: pal("#0B1F33", "#F1F3EF", "#708779") },
  { id: "navy-ice", nome: "Navy Ice", sensacao: "Dados / investigação", amostras: ["#10283F", "#EEF3F6", "#6FA6B8", "#AAB8C2", "#20252B"], cores: pal("#10283F", "#EEF3F6", "#6FA6B8") },
];
export const PALETAS: readonly PaletaMarca[] = [...PALETAS_PRINCIPAIS, ...PALETAS_ANTERIORES];
export const obterPaleta = (id: unknown) => PALETAS.find((p) => p.id === id) ?? PALETAS_ANTERIORES[0];

/** Slide number (1-based) → break on/off. */
export type Quebras = Record<string, boolean>;
export interface Tipografia { titulo: Familia; corpo: Familia }
export interface SistemaVisual { estilo: EstiloId; variante: Variante; paleta: PaletaId; quebras: Quebras; ritmo?: "auto" | "personalizado"; imagens?: "auto" | "manual"; tipografia?: Tipografia }
/** Default typography for new content, whatever the direction. */
export const TIPOGRAFIA_PADRAO: Tipografia = { titulo: "montserrat", corpo: "inter" };
/** Five main typographic pairs (Work Sans stays only for legacy documents). */
export const PARES_PRINCIPAIS = PARES_FONTES.filter((p) => p.id !== "worksans");
/** Typography in effect: explicit choice, else the legacy pair of the style (old documents look the same). */
export function tipografiaDe(s: Pick<SistemaVisual, "estilo" | "tipografia">): Tipografia {
  if (s.tipografia) return s.tipografia;
  const par = PARES_FONTES.find((p) => p.id === ESTILOS.find((e) => e.id === s.estilo)?.par) ?? PARES_FONTES[0];
  return { titulo: par.titulo, corpo: par.corpo };
}
export const idPar = (t: Tipografia) => PARES_FONTES.find((p) => p.titulo === t.titulo && p.corpo === t.corpo)?.id ?? null;

/** Human names of the two compositions of each style (internally documents A and B). */
export const NOMES_VARIANTE: Record<EstiloId, Record<Variante, string>> = {
  editorial: { A: "Coluna clássica", B: "Editorial assimétrico" },
  impacto: { A: "Painéis geométricos", B: "Tipografia expressiva" },
  contraste: { A: "Geométrico", B: "Radical" },
  revista: { A: "Fotografia dominante", B: "Manchete dominante" },
  fotografico: { A: "Imagem integral", B: "Painel translúcido" },
  minimalista: { A: "Suíço", B: "Airy" },
  didatico: { A: "Passos", B: "Cartões" },
};
export const nomeVariante = (estilo: string | undefined, v: Variante) => NOMES_VARIANTE[(estilo ?? "editorial") as EstiloId]?.[v] ?? (v === "A" ? "Variante 1" : "Variante 2");

/** Visual system stored in the document (both variant documents carry the same one). */
export function sistemaDoPacote(p: PacoteProva): SistemaVisual | null {
  const s = p.variantes.A.sistema ?? p.variantes.B.sistema;
  if (!s || !ESTILOS.some((e) => e.id === s.estilo)) return null;
  return { estilo: s.estilo as EstiloId, variante: s.variante, paleta: obterPaleta(s.paleta).id, quebras: s.quebras ?? {}, ritmo: s.ritmo, imagens: s.imagens, ...(s.tipografia ? { tipografia: s.tipografia } : {}) };
}
const comSistema = (p: PacoteProva, s: SistemaVisual): PacoteProva =>
  ({ ...p, variantes: { A: { ...p.variantes.A, sistema: { ...s } }, B: { ...p.variantes.B, sistema: { ...s } } } });

/** Layers the visual system generates (text bound to the narrative, page number, "mod-" decorations, images). */
export const geradaPeloSistema = (c: Camada) => (c.tipo === "texto" && (!!c.ref || c.id === "num")) || c.id.startsWith("mod-") || c.id.startsWith("fx-") || c.tipo === "imagem" || c.id === "faixa" || c.id === "regua" || c.id === "bloco";
/** Pages (per variant) with manual adjustments over generated layers. */
export function paginasComAjustes(p: PacoteProva, v?: Variante, paginas?: number[]): number {
  const vs = v ? [v] : (["A", "B"] as const);
  let n = 0;
  for (const x of vs) p.variantes[x].paginas.forEach((pg, i) => { if ((!paginas || paginas.includes(i)) && pg.camadas.some((c) => c.manual && geradaPeloSistema(c))) n++; });
  return n;
}

/** Palette-only change: maps the old palette's colours to the new one; geometry, images, crops, roles untouched. */
export function recolorir(p: PacoteProva, de: PaletaId, para: PaletaId): PacoteProva {
  const a = obterPaleta(de).cores, b = obterPaleta(para).cores;
  const mapa = new Map<string, string>();
  for (const k of ["fundo", "fundoCapa", "titulo", "texto", "destaque", "discreto"] as const) if (!mapa.has(a[k].toLowerCase())) mapa.set(a[k].toLowerCase(), b[k]);
  const cor = (c: string) => mapa.get(c.toLowerCase()) ?? c;
  const variantes = { ...p.variantes };
  for (const v of ["A", "B"] as const) {
    const d = p.variantes[v];
    variantes[v] = { ...d, sistema: d.sistema ? { ...d.sistema, paleta: para } : d.sistema, paginas: d.paginas.map((pg) => ({ ...pg, fundo: cor(pg.fundo), camadas: pg.camadas.map((c) =>
      c.tipo === "texto" ? { ...c, estilo: { ...c.estilo, cor: cor(c.estilo.cor) } } : c.tipo === "forma" ? { ...c, estilo: { ...c.estilo, cor: cor(c.estilo.cor) } } : c) })) };
  }
  return { ...p, variantes };
}

/** Default rhythm: breaks on slides 3, 5 and the last (8 in an 8-slide carousel); never on the cover. */
export function quebrasPadrao(total: number): Quebras {
  const q: Quebras = {};
  for (const n of [3, 5, Math.max(total, 1)]) if (n > 1 && n <= total) q[String(n)] = true;
  return q;
}
/** Slides that can carry a break toggle for this carousel size. */
export const slidesQuebra = (total: number) => Object.keys(quebrasPadrao(total)).map(Number).sort((a, b) => a - b);

export const sistemaPadrao = (total: number, estilo: EstiloId = "editorial"): SistemaVisual =>
  ({ estilo, variante: "A", paleta: "azul", quebras: quebrasPadrao(total), tipografia: { ...TIPOGRAFIA_PADRAO } });

const texto = (c: Camada) => c.tipo === "texto" && !!c.ref;
const LIMITE_B = 1210;
/** True when the text fits its box at exactly this size (no shrink, no word split). */
function cabeA(c: CamadaTexto, tam: number, h: number, conteudo?: ConteudoEditorial, m?: Medidor): boolean {
  if (!m || !conteudo) return false;
  const t = resolverTexto(c, conteudo);
  const l = layoutTexto(t, { ...c.estilo, tam, tamMin: tam, maxLinhas: undefined }, c.w, 4000, m);
  const palavras = new Set(l.linhas.flatMap((x) => x.texto.split(/\s+/)));
  if (t.split(/\s+/).filter(Boolean).some((p, k) => k > 0 && !palavras.has(p))) return false;
  return l.linhas.length * l.alturaLinha + 8 <= h;
}
/**
 * Variant 2 of every style (Contemporâneo, Radical, Tipográfico, Glass, Airy, Cards): a contemporary reading
 * of the style, not a mirror — bigger titles when they still fit at that exact size, the text block anchored
 * low (negative space above), contained photos bleeding off the page edge with a tighter crop, and the accent
 * rule turned into a vertical bar on the margin. Manual layers never move; text never shrinks.
 */
export function composicaoB(p: Pagina, conteudo?: ConteudoEditorial, m?: Medidor, estilo?: EstiloId): Pagina {
  let camadas = [...p.camadas];
  // 1. Larger title (+14%, then +8%) only if it fits at that size; following text moves down by the growth.
  const ti = camadas.findIndex((c) => c.tipo === "texto" && !!c.ref?.endsWith(".titulo"));
  if (ti >= 0) {
    const t = camadas[ti] as CamadaTexto;
    for (const f of [1.14, 1.08]) {
      const tam = Math.round(t.estilo.tam * f);
      const l = m && conteudo ? layoutTexto(resolverTexto(t, conteudo), { ...t.estilo, tam, tamMin: tam, maxLinhas: undefined }, t.w, 4000, m) : null;
      if (!l) break;
      const h = Math.ceil(l.linhas.length * l.alturaLinha) + 8;
      const cresce = Math.max(0, h - t.h);
      const abaixo = camadas.filter((c) => texto(c) && c !== t && c.y >= t.y);
      const fundo = Math.max(t.y + h, ...abaixo.map((c) => c.y + c.h + cresce));
      if (fundo > LIMITE_B || !cabeA(t, tam, Math.max(h, t.h), conteudo, m)) continue;
      camadas = camadas.map((c) => c === t ? { ...t, h: Math.max(h, t.h), estilo: { ...t.estilo, tam, tamMin: Math.min(t.estilo.tamMin ?? tam, tam) } } : abaixo.includes(c) ? { ...c, y: c.y + cresce } : c);
      break;
    }
  }
  // 2. Contained photo bleeds to the nearest page edge with a tighter, higher crop.
  camadas = camadas.map((c) => {
    if (c.tipo !== "imagem" || c.manual || c.w >= LARGURA - 1 || c.w < 300) return c;
    const dir = c.x + c.w / 2 >= LARGURA / 2;
    const x = dir ? c.x : 0, w = dir ? LARGURA - c.x : c.x + c.w;
    return { ...c, x, w, foco: { x: dir ? 0.4 : 0.6, y: Math.max(0, (c.foco?.y ?? 0.5) - 0.12) } };
  });
  // 3. Thin accent marks become a vertical bar on the left margin.
  camadas = camadas.map((c) => (c.tipo === "forma" && c.id.startsWith("mod-") && !c.manual && c.h <= 16 && c.w <= 120 && c.w > c.h
    ? { ...c, x: 40, w: 10, h: Math.min(220, Math.max(120, c.w * 2)), y: c.y } : c));
  // 4. Page number moves to the top corner (editorial "folio" of the contemporary reading).
  camadas = camadas.map((c) => (c.tipo === "texto" && c.id === "num" && !c.manual && c.y > ALTURA / 2 ? { ...c, x: LARGURA - 96 - c.w, y: 56, estilo: { ...c.estilo, alinh: "dir" } } : c));
  // 5. Text block anchored low when there is no photo above it and no panel behind it.
  const ts = camadas.filter((c) => texto(c) && !c.manual);
  const titulo = ts.find((c) => c.tipo === "texto" && c.ref?.endsWith(".titulo"));
  const sobrePainel = titulo && camadas.some((d) => d.tipo === "forma" && d.id.startsWith("mod-") && d.w < LARGURA && d.h > 120 && d.z < titulo.z
    && d.x <= titulo.x && d.x + d.w >= titulo.x + 20 && d.y <= titulo.y && d.y + d.h >= titulo.y + 20);
  const temImagem = camadas.some((c) => c.tipo === "imagem" && c.h < ALTURA);
  if (ts.length && !sobrePainel && !temImagem) {
    const topo = Math.min(...ts.map((c) => c.y)), base = Math.max(...ts.map((c) => c.y + c.h));
    const desl = Math.floor(1180 - base);
    if (desl > 40) {
      camadas = camadas.map((c) => (ts.includes(c) || (c.tipo === "forma" && c.id.startsWith("mod-") && !c.manual && c.h < 400 && c.y >= topo - 140 && c.y <= base + 60)
        ? { ...c, y: c.y + desl } : c));
    }
  }
  // 6. Fotográfico «Glass»: a frosted panel behind the text block instead of a bare fade.
  if (estilo === "fotografico") {
    const tx = camadas.filter((c) => texto(c) && !c.manual);
    if (tx.length) {
      const x0 = Math.min(...tx.map((c) => c.x)) - 40, y0 = Math.min(...tx.map((c) => c.y)) - 40;
      const x1 = Math.max(...tx.map((c) => c.x + c.w)) + 40, y1 = Math.max(...tx.map((c) => c.y + c.h)) + 32;
      const z = Math.min(...tx.map((c) => c.z)) - 1;
      camadas = [...camadas.filter((c) => c.id !== "mod-glass"), { id: "mod-glass", tipo: "forma", forma: "ret", x: Math.max(24, x0), y: Math.max(24, y0), w: Math.min(LARGURA - 24, x1) - Math.max(24, x0), h: Math.min(ALTURA - 24, y1) - Math.max(24, y0), z, opacidade: 0.16, estilo: { cor: "#FFFFFF", raio: 28 } }];
    }
  }
  return { ...p, camadas };
}

export interface ResultadoSistema {
  pacote: PacoteProva;
  /** Pages left as they were because the style does not fit at the readable minimum. */
  recusadas: Array<{ variante: Variante; pagina: number }>;
  /** Break slides that did not fit with the break composition and use the normal one instead. */
  quebrasRecusadas: Array<{ variante: Variante; pagina: number }>;
  marcador: boolean;
  /** Pages whose image mode did not fit; they keep the style composition without the image re-layout. */
  imagemRecusadas: Array<{ variante: Variante; pagina: number }>;
  /** Resolved image decision per `${variante}:${pagina}` (shown as "Automático: …" in the panel). */
  decisoes: Record<string, DecisaoImagem>;
}

export interface OpcoesSistema {
  /** "manter": layers the user adjusted keep their state; "recriar": everything generated is rebuilt. */
  ajustes?: "manter" | "recriar";
  /** Redesign only: recompose hand-typed texts (no editorial ref) instead of leaving the page untouched. */
  adotarLivres?: boolean;
  /** Restrict to these variant documents (catalogue thumbnails); others are returned unchanged. */
  variantes?: Variante[];
}

/**
 * The single renderer of a visual system, reading role and image choices from the document's own pages
 * (legacy map only as fallback) and writing the system, role and choices back into the document.
 * Variant A's document gets the style's first composition and B's the second; palette supplies colours.
 */
export function aplicarSistema(pacote: PacoteProva, s: SistemaVisual, m?: Medidor, paginas?: number[], composicoes: ComposicoesImagem = {}, op: OpcoesSistema = {}): ResultadoSistema {
  const estilo = ESTILOS.find((e) => e.id === s.estilo) ?? ESTILOS[0];
  const paleta = obterPaleta(s.paleta).cores;
  const recusadas: ResultadoSistema["recusadas"] = [], quebrasRecusadas: ResultadoSistema["quebrasRecusadas"] = [];
  let marcador = false;
  const imagemRecusadas: ResultadoSistema["imagemRecusadas"] = [];
  const decisoes: ResultadoSistema["decisoes"] = {};
  const variantes = { ...pacote.variantes };
  const manter = op.ajustes !== "recriar";
  const papeis = PAPEIS.map((x) => x.id) as string[];
  for (const v of ["A", "B"] as const) {
    if (op.variantes && !op.variantes.includes(v)) continue;
    const doc = pacote.variantes[v];
    const total = doc.paginas.length;
    variantes[v] = { ...doc, paginas: doc.paginas.map((pg, i) => {
      if (paginas && !paginas.includes(i)) return pg;
      const sid = (pg.camadas.find((c) => c.tipo === "texto" && !!c.ref) as { ref?: string } | undefined)?.ref?.split(".")[0] ?? pg.slide ?? "";
      const comp = (pg.composicao as ComposicaoImagem | undefined) ?? composicoes[chaveComposicao(v, sid)];
      const sl = pacote.conteudo.slides.find((x) => x.id === sid);
      const papel = (papeis.includes(pg.papel ?? "") ? pg.papel : comp?.papel ?? (sl ? inferirPapel(sl, i, total) : undefined)) as PapelVisual | undefined;
      const fixar = (r0: Pagina): Pagina => {
        const r = aplicarEfeitos(r0, s.estilo, paleta, (comp as { efeitos?: OverrideEfeitos } | undefined)?.efeitos, doc.altura);
        let camadas = r.camadas;
        if (manter) {
          // Restore what the user adjusted by hand (same id), re-adding it if the style dropped it.
          const ajustadas = pg.camadas.filter((c) => c.manual);
          const ids = new Set(ajustadas.map((c) => c.id));
          camadas = [...camadas.filter((c) => !ids.has(c.id)), ...ajustadas];
        } else camadas = camadas.map((c) => (c.manual ? (({ manual: _m, ...x }) => x as Camada)(c) : c));
        return { ...r, camadas, ...(papel ? { papel } : {}), ...(comp && Object.keys(comp).length ? { composicao: { ...comp } as Record<string, unknown> } : {}) };
      };
      const ctx = { altura: doc.altura, unica: (doc.formato ?? "carrossel") !== "carrossel", indice: i, total, paleta, par: estilo.par, tipografia: tipografiaDe(s), conteudo: pacote.conteudo, assets: pacote.assets, m, adotarLivres: !!op.adotarLivres };
      const forte = i > 0 && !!s.quebras[String(i + 1)];
      let r = comporModelo(pg, s.estilo, { ...ctx, forte });
      if (forte && r && !r.cabe) { quebrasRecusadas.push({ variante: v, pagina: i }); r = comporModelo(pg, s.estilo, ctx); }
      if (!r) return fixar(pg);
      if (!r.cabe) { recusadas.push({ variante: v, pagina: i }); return fixar(pg); }
      marcador ||= r.marcador;
      const base = v === "B" && (doc.formato ?? "carrossel") === "carrossel" ? composicaoB(r.pagina, pacote.conteudo, m, s.estilo) : r.pagina;
      if (s.imagens === "manual" && !(comp && Object.keys(comp).length)) return fixar(base);
      const ri = comporImagem(base, { indice: i, total, estilo: s.estilo, variante: v, paleta, conteudo: pacote.conteudo, m, comp, assets: pacote.assets, papel, altura: doc.altura });
      if (!ri) return fixar(base);
      decisoes[`${v}:${i}`] = ri.decisao;
      if (!ri.cabe) imagemRecusadas.push({ variante: v, pagina: i });
      return fixar(ri.pagina);
    }) };
  }
  return { pacote: comSistema({ ...pacote, variantes }, s), recusadas, quebrasRecusadas, marcador, imagemRecusadas, decisoes };
}

/**
 * One-way migration of legacy side tables (visual system + per-slide image choices) into the document.
 * Geometry is untouched (those documents were already composed with that system).
 */
export function migrarLegado(p: PacoteProva, s: SistemaVisual | null, mapa: ComposicoesImagem): PacoteProva {
  const temMapa = Object.keys(mapa).length > 0;
  if (!s && !temMapa) return p;
  const variantes = { ...p.variantes };
  for (const v of ["A", "B"] as const) {
    const d = p.variantes[v];
    variantes[v] = { ...d, ...(s ? { sistema: { ...s } } : {}), paginas: d.paginas.map((pg) => {
      const sid = (pg.camadas.find((c) => c.tipo === "texto" && !!c.ref) as { ref?: string } | undefined)?.ref?.split(".")[0] ?? pg.slide ?? "";
      const c = mapa[chaveComposicao(v, sid)];
      if (!c || pg.composicao) return pg;
      const { papel, ...resto } = c;
      return { ...pg, ...(papel && !pg.papel ? { papel } : {}), ...(Object.keys(resto).length ? { composicao: { ...resto } as Record<string, unknown> } : {}) };
    }) };
  }
  return { ...p, variantes };
}
