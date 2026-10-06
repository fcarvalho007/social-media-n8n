// "Redesenhar slide": composition exploration for ONE page. Deterministic, no network. One slot is reserved for
// AI_IMAGE_COMPOSITION (layout decided first, image generated for it later by the caller — at most one per round).
// Every candidate is produced by the same aplicarSistema used by the canvas and export, so a candidate's
// page is exactly what enters the document if applied. Content (texts/refs) is never changed.
import { resolverTexto, type Camada, type ConteudoEditorial, type Medidor, type PacoteProva, type Pagina, type Variante } from "../documento-grafico/nucleo.ts";
import type { EstiloId } from "./estilos.ts";
import type { ComposicaoImagem, ModoImagem, PapelVisual, RegiaoTexto, TipoOverlay } from "./imagem.ts";
import { aplicarSistema, geradaPeloSistema, type SistemaVisual } from "./sistema.ts";
import type { OverrideEfeitos } from "./efeitos.ts";
import { construirPromptComposicao } from "./promptVisual.ts";

export type EstrategiaRedesign = "TYPOGRAPHY_LED" | "EDITORIAL_SPLIT" | "PHOTO_HERO" | "FULL_BLEED" | "OVERLAP" | "MINIMAL" | "CALLOUT" | "CONTAINED" | "EXPLORE" | "AI_IMAGE_COMPOSITION";
export interface CandidatoRedesign {
  id: string;
  strategy: EstrategiaRedesign;
  label: string;
  reason: string;
  pagina: Pagina;
  /** Style the page was composed with (differs from the global style only in "explorar"). */
  estilo: EstiloId;
  requiresAiImage: boolean;
  estimatedCost: null;
  /** AI_IMAGE_COMPOSITION only: English prompt generated for the pre-decided layout. */
  promptIA?: string;
  /** AI_IMAGE_COMPOSITION only: true while the page shows the structural placeholder (cannot be applied). */
  pendente?: boolean;
  /** Deliberately breaks the current page pattern while preserving content and the global visual system. */
  disruptiva?: boolean;
}
export interface OpcoesRedesign {
  pacote: PacoteProva;
  sistema: SistemaVisual;
  variante: Variante;
  indice: number;
  m?: Medidor;
  modo?: "manter" | "explorar";
  imagens?: "auto" | "sem_novas" | "ia";
  /** Number of proposals (default 5). */
  n?: number;
  /** Seed to rotate strategies on "Gerar mais 5". */
  ronda?: number;
  /** Reserve one slot for AI_IMAGE_COMPOSITION (default true; "sem_novas" disables it). */
  incluirIA?: boolean;
}

/** Placeholder asset id used only for the structural preview of the AI proposal; never applied. */
export const ASSET_IA_PENDENTE = "ia-pendente";
const PNG_NEUTRO = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==";

/** Pages where an image would hurt clarity (dense data, comparisons, action lists). */
export function imagemInadequada(papel: PapelVisual | undefined): boolean {
  return papel === "data" || papel === "comparison" || papel === "actions";
}

/** Layout for the AI proposal, decided BEFORE generation; varies by role and avoids modes already used. */
type DecisaoIA = { modo: ModoImagem; regiao: RegiaoTexto; overlay: TipoOverlay };
export function decidirComposicaoIA(papel: PapelVisual | undefined, usados: ModoImagem[], ronda = 0): DecisaoIA {
  return opcoesComposicaoIA(papel, usados, ronda)[0];
}
/** Ordered layout options (preferred first, unused modes before used ones); the first that fits wins. */
export function opcoesComposicaoIA(papel: PapelVisual | undefined, usados: ModoImagem[], ronda = 0): DecisaoIA[] {
  const pref: Record<string, Array<[ModoImagem, RegiaoTexto, TipoOverlay]>> = {
    cover: [["full_bleed", "bottom", "gradient"], ["full_bleed", "left", "gradient"], ["hero", "bottom", "gradient"]],
    visual_story: [["full_bleed", "bottom", "gradient"], ["full_bleed", "left", "glass"], ["split", "left", "none"]],
    case_study: [["hero", "bottom", "gradient"], ["split", "right", "none"], ["full_bleed", "bottom", "gradient"]],
    concept: [["full_bleed", "left", "gradient"], ["background", "center", "vignette"], ["split", "left", "none"]],
    conclusion: [["full_bleed", "center", "vignette"], ["full_bleed", "bottom", "gradient"], ["contained", "bottom", "none"]],
    transition: [["background", "center", "vignette"], ["full_bleed", "bottom", "gradient"]],
    standard: [["split", "left", "none"], ["contained", "bottom", "none"], ["full_bleed", "left", "gradient"]],
  };
  const lista = pref[papel ?? "standard"] ?? pref.standard;
  const rodada = [...lista.slice(ronda % lista.length), ...lista.slice(0, ronda % lista.length)];
  const extra: Array<[ModoImagem, RegiaoTexto, TipoOverlay]> = [["full_bleed", "bottom", "gradient"], ["hero", "bottom", "gradient"], ["split", "left", "none"], ["contained", "bottom", "none"], ["background", "center", "vignette"]];
  const todas = [...rodada, ...extra].filter((x, i, a) => a.findIndex((y) => y.join() === x.join()) === i);
  const ord = [...todas.filter(([m]) => !usados.includes(m)), ...todas.filter(([m]) => usados.includes(m))];
  return ord.map(([modo, regiao, overlay]) => ({ modo, regiao, overlay }));
}

interface Receita { strategy: EstrategiaRedesign; label: string; reason: string; precisaImagem: boolean; comp: Partial<ComposicaoImagem>; efeitos?: OverrideEfeitos; estilo?: EstiloId }

const r = (strategy: EstrategiaRedesign, label: string, reason: string, precisaImagem: boolean, modo: ModoImagem, regiao?: RegiaoTexto, overlay?: TipoOverlay, efeitos?: OverrideEfeitos, estilo?: EstiloId): Receita =>
  ({ strategy, label, reason, precisaImagem, comp: { modo, ...(regiao ? { regiao } : {}), ...(overlay ? { overlay } : {}) }, efeitos, estilo });

const RECEITAS: Receita[] = [
  r("TYPOGRAPHY_LED", "Tipografia dominante", "Dá protagonismo ao título; a imagem sai de cena.", false, "none", undefined, undefined, { accentLine: true }),
  r("PHOTO_HERO", "Imagem hero", "Imagem forte em cima, texto em baixo com transição contínua.", true, "hero", "bottom", "gradient"),
  r("EDITORIAL_SPLIT", "Editorial assimétrico", "Grelha em duas colunas: imagem à direita, texto à esquerda.", true, "split", "left"),
  r("FULL_BLEED", "Fotografia de página inteira", "Imagem ocupa a página; o texto assenta num gradiente direccional.", true, "full_bleed", "bottom", "gradient"),
  r("OVERLAP", "Texto sobre imagem", "Texto lateral sobreposto à fotografia com painel translúcido.", true, "full_bleed", "left", "glass"),
  r("MINIMAL", "Mínimo", "Só o essencial e máximo espaço negativo, sem efeitos.", false, "none", undefined, undefined,
    { accentLine: false, glow: false, shadow: false, grid: false, scanlines: false, corners: false, particulas: false }),
  r("CONTAINED", "Imagem contida", "A imagem fica num enquadramento discreto, o texto lidera.", true, "contained"),
  r("CALLOUT", "Destaque com elementos", "Reforça o acento gráfico e dá relevo ao elemento principal.", false, "none", undefined, undefined, { accentLine: true, glow: true, corners: true }),
  r("EDITORIAL_SPLIT", "Coluna inversa", "Imagem à esquerda e texto à direita.", true, "split", "right"),
];
const FALLBACKS_DISRUPTIVOS: Receita[] = [
  r("EXPLORE", "Cartaz tipográfico", "Quebra a grelha com título protagonista e espaço negativo.", false, "none", undefined, undefined, { accentLine: true, grid: false, glow: false }, "contraste"),
  r("EXPLORE", "Página editorial limpa", "Simplifica para leitura premium, com ritmo de revista.", false, "none", undefined, undefined, { accentLine: true, shadow: false, scanlines: false }, "minimalista"),
  r("EXPLORE", "Capa de revista", "Aumenta a hierarquia e muda o ritmo visual sem trocar o conteúdo.", false, "none", undefined, undefined, { accentLine: true, particulas: false }, "revista"),
  r("EXPLORE", "Mapa didático", "Organiza o slide como explicação clara, com acentos funcionais.", false, "none", undefined, undefined, { corners: true, grid: false }, "didatico"),
];
const EXPLORAR: Array<{ estilo: EstiloId; label: string }> = [
  { estilo: "revista", label: "Aproxima-se de Revista" }, { estilo: "fotografico", label: "Abordagem Fotográfica" },
  { estilo: "contraste", label: "Aproxima-se de Contraste" }, { estilo: "minimalista", label: "Abordagem Minimalista" },
  { estilo: "didatico", label: "Aproxima-se de Didático" }, { estilo: "editorial", label: "Abordagem Editorial" },
];

/** Hash of the textual content a page shows (refs + resolved texts). Must be identical across candidates. */
export function hashConteudo(p: Pagina, conteudo: ConteudoEditorial): string {
  return p.camadas.filter((c) => c.tipo === "texto").map((c) => `${c.tipo === "texto" ? c.ref ?? c.id : ""}=${c.tipo === "texto" ? resolverTexto(c, conteudo) : ""}`).sort().join("\u0001");
}

/** Coarse geometry signature used to reject near-identical proposals. */
export function assinatura(p: Pagina): string {
  const b = (n: number, q: number) => Math.round(n / q);
  const img = p.camadas.find((c) => c.tipo === "imagem");
  const t = p.camadas.find((c) => c.tipo === "texto" && !!c.ref?.endsWith(".titulo"));
  const area = img ? b((img.w * img.h) / (1080 * 1350), 0.2) : -1;
  const grupos = p.camadas.filter((c) => c.tipo === "forma" && !c.id.startsWith("fx-")).length;
  const fx = p.camadas.filter((c) => c.id.startsWith("fx-")).map((c) => c.id.replace(/[-\d]+$/, "")).sort().filter((x, i, a) => a.indexOf(x) === i).join(",");
  return [area, img ? `${b(img.x, 270)},${b(img.y, 340)}` : "-", t ? `${b(t.x, 270)},${b(t.y, 270)},${b(t.w, 360)}` : "-",
    t && t.tipo === "texto" ? `${t.estilo.alinh},${b(t.estilo.tam, 16)}` : "-", b(grupos, 2), fx].join("|");
}

const marcarManual = (c: Camada): Camada => (geradaPeloSistema(c) ? { ...c, manual: true } : c);

export function redesenharPagina(o: OpcoesRedesign): { candidatos: CandidatoRedesign[]; sugerirIA: boolean; aviso?: string } {
  const doc = o.pacote.variantes[o.variante];
  const orig = doc.paginas[o.indice];
  if (!orig) return { candidatos: [], sugerirIA: false };
  const n = o.n ?? 5;
  const hash0 = hashConteudo(orig, o.pacote.conteudo);
  const comp0 = (orig.composicao ?? {}) as ComposicaoImagem;
  const papel = orig.papel as PapelVisual | undefined;
  // Image available: this page's own, or (Automático) another photo already in the package. No downloads.
  const propria = orig.camadas.find((c) => c.tipo === "imagem");
  const assetPagina = propria && propria.tipo === "imagem" ? propria.asset_id : comp0.asset_id ?? undefined;
  const assetPacote = Object.keys(o.pacote.assets ?? {})[0];
  const asset = assetPagina ?? (o.imagens !== "sem_novas" ? assetPacote : undefined);
  const vistos = new Set<string>([assinatura(orig)]);
  const saida: CandidatoRedesign[] = [];
  let receitas = RECEITAS.filter((x) => !x.precisaImagem || asset);
  if (o.modo === "explorar") {
    const outros = EXPLORAR.filter((e) => e.estilo !== o.sistema.estilo);
    receitas = [...outros.map((e, i) => ({ ...RECEITAS[i % RECEITAS.length], strategy: "EXPLORE" as const, label: e.label, reason: "Composição excepcional desta página; o estilo global não muda.", estilo: e.estilo, precisaImagem: false })), ...receitas];
  }
  const rot = (o.ronda ?? 0) * n;
  receitas = [...receitas.slice(rot % Math.max(1, receitas.length)), ...receitas.slice(0, rot % Math.max(1, receitas.length))];
  const papelIA = papel;
  const querIA = (o.incluirIA ?? true) && o.imagens !== "sem_novas" && !imagemInadequada(papelIA);
  const nDisruptivas = o.incluirIA === false && n >= 5 ? 2 : 0;
  const nNormais = querIA ? n - 1 : n - nDisruptivas;
  for (const rc of receitas) {
    if (saida.length >= nNormais) break;
    const c = comporCandidato(o, rc, asset, vistos, saida.length);
    if (c) saida.push(c);
  }
  if (nDisruptivas) {
    const estilos = EXPLORAR.filter((e) => e.estilo !== o.sistema.estilo);
    for (let tentativa = 0; saida.length < n && tentativa < estilos.length * 3; tentativa++) {
      const e = estilos[(tentativa + (o.ronda ?? 0) * 2) % estilos.length];
      const base = tentativa % 2 === 0 ? RECEITAS[0] : RECEITAS[5];
      const rc: Receita = { ...base, strategy: "EXPLORE", estilo: e.estilo, label: e.label, reason: "Quebra deliberadamente o padrão deste slide; a direção visual global mantém-se.", precisaImagem: false };
      const c = comporCandidato(o, rc, undefined, vistos, saida.length);
      if (c) saida.push({ ...c, disruptiva: true });
    }
  }
  const alvoAntesIA = querIA ? n - 1 : n;
  for (let tentativa = 0; saida.length < alvoAntesIA && tentativa < FALLBACKS_DISRUPTIVOS.length * 4; tentativa++) {
    const rc = FALLBACKS_DISRUPTIVOS[(tentativa + (o.ronda ?? 0)) % FALLBACKS_DISRUPTIVOS.length];
    const c = comporCandidato(o, rc, undefined, vistos, saida.length, tentativa >= FALLBACKS_DISRUPTIVOS.length);
    if (c) saida.push({ ...c, disruptiva: saida.filter((x) => x.disruptiva).length < 2 });
  }
  if (querIA) {
    const usados = saida.map((c) => (c.pagina.composicao as ComposicaoImagem | undefined)?.modo).filter((x): x is ModoImagem => !!x);
    const s0 = o.pacote.conteudo.slides.find((x) => x.id === orig.slide);
    let c: CandidatoRedesign | null = null, promptIA = "";
    for (const d of opcoesComposicaoIA(papel, usados, o.ronda ?? 0)) {
      promptIA = construirPromptComposicao({ titulo: s0?.titulo ?? "", texto: s0?.texto, intencao: comp0.visual_intent, papel: papel ?? "standard",
        estilo: o.sistema.estilo, variante: o.sistema.variante, paleta: o.sistema.paleta, modo: d.modo, regiao: d.regiao });
      const rc: Receita = { strategy: "AI_IMAGE_COMPOSITION", label: "Imagem IA integrada", reason: "Imagem gerada para esta composição: sujeito longe do texto, fundo integrado na paleta.",
        precisaImagem: true, comp: { modo: d.modo, regiao: d.regiao, overlay: d.overlay, origem: "kie", visual_prompt: promptIA } };
      const pac = { ...o, pacote: { ...o.pacote, assets: { ...(o.pacote.assets ?? {}), [ASSET_IA_PENDENTE]: { id: ASSET_IA_PENDENTE, mime: "image/png" as const, largura: 1080, altura: 1350, dados: PNG_NEUTRO } } } };
      c = comporCandidato(pac, rc, ASSET_IA_PENDENTE, new Set(), saida.length, true);
      if (c && c.pagina.camadas.some((l) => l.tipo === "imagem" && l.asset_id === ASSET_IA_PENDENTE)) break;
      c = null;
    }
    if (c) saida.splice(Math.min(2, saida.length), 0, { ...c, requiresAiImage: true, promptIA, pendente: true });
    // AI layout cannot fit this page: the slot goes back to a regular composition.
    else for (const rc of [...receitas, ...FALLBACKS_DISRUPTIVOS]) { if (saida.length >= n) break; const x = comporCandidato(o, rc, asset, vistos, saida.length, saida.length > 2); if (x) saida.push(x); }
  }
  for (let tentativa = 0; saida.length < n && tentativa < FALLBACKS_DISRUPTIVOS.length * 6; tentativa++) {
    const rc = FALLBACKS_DISRUPTIVOS[(tentativa + 2 + (o.ronda ?? 0)) % FALLBACKS_DISRUPTIVOS.length];
    const x = comporCandidato(o, rc, undefined, vistos, saida.length, true);
    if (x) saida.push({ ...x, disruptiva: saida.filter((c) => c.disruptiva).length < 2 });
  }
  const sugerirIA = !querIA && !asset && (papel === "cover" || papel === "visual_story" || papel === "concept");
  const aviso = saida.length < n ? `Só foi possível criar ${saida.length} composição(ões) sem cortar conteúdo nem reduzir letra.` : undefined;
  return { candidatos: saida, sugerirIA, aviso };
}

function comporCandidato(o: OpcoesRedesign, rc: Receita, asset: string | undefined, vistos: Set<string>, idx: number, ignorarAssinatura = false): CandidatoRedesign | null {
  const doc = o.pacote.variantes[o.variante];
  const orig = doc.paginas[o.indice];
  const hash0 = hashConteudo(orig, o.pacote.conteudo);
  const comp0 = (orig.composicao ?? {}) as ComposicaoImagem;
  const papel = orig.papel as PapelVisual | undefined;
  const comp: ComposicaoImagem = { ...comp0, ...rc.comp, ...(papel ? { papel } : {}), ...(rc.comp.modo !== "none" && asset ? { asset_id: asset } : {}),
    ...(rc.efeitos ? { efeitos: { ...(comp0.efeitos ?? {}), ...rc.efeitos } } : {}), estrategia: rc.strategy };
  // The AI proposal must not reuse the page's current photo: drop existing image layers so the new asset is the one composed.
  const camadas = orig.camadas.filter((c) => !(rc.strategy === "AI_IMAGE_COMPOSITION" && c.tipo === "imagem")).map((c) => (c.manual ? (({ manual: _m, ...x }) => x as Camada)(c) : c));
  const pg: Pagina = { ...orig, composicao: comp as Record<string, unknown>, camadas };
  const p: PacoteProva = { ...o.pacote, variantes: { ...o.pacote.variantes, [o.variante]: { ...doc, paginas: doc.paginas.map((x, i) => (i === o.indice ? pg : x)) } } };
  const sis = { ...o.sistema, ...(rc.estilo ? { estilo: rc.estilo } : {}), imagens: "auto" as const };
  let res;
  try { res = aplicarSistema(p, sis, o.m, [o.indice], {}, { ajustes: "recriar", variantes: [o.variante] }); } catch { return null; }
  if (res.recusadas.length || res.imagemRecusadas.length) return null; // never shrink: refuse what does not fit
  const nova = res.pacote.variantes[o.variante].paginas[o.indice];
  if (hashConteudo(nova, o.pacote.conteudo) !== hash0) return null;
  const sig = assinatura(nova);
  if (!ignorarAssinatura && vistos.has(sig)) return null;
  vistos.add(sig);
  return { id: `${rc.strategy}-${idx}-${o.ronda ?? 0}`, strategy: rc.strategy, label: rc.label, reason: rc.reason,
    pagina: { ...nova, camadas: nova.camadas.map(marcarManual) }, estilo: sis.estilo, requiresAiImage: false, estimatedCost: null };
}

/**
 * Swaps the AI proposal's placeholder (or a previous AI asset on "Regenerar imagem IA") for a real asset.
 * Layout, text region, overlay, effects and content stay exactly as decided; only the image changes.
 * `pacote` must already contain the new asset.
 */
export function substituirImagemIA(c: CandidatoRedesign, assetId: string, extra: { modelo?: string; prompt?: string } = {}): CandidatoRedesign {
  const anterior = ((c.pagina.composicao ?? {}) as ComposicaoImagem).asset_id ?? ASSET_IA_PENDENTE;
  const comp = { ...(c.pagina.composicao ?? {}), asset_id: assetId, origem: "kie", ...(extra.modelo ? { image_model: extra.modelo } : {}), ...(extra.prompt ? { visual_prompt: extra.prompt } : {}) };
  return { ...c, pendente: false, pagina: { ...c.pagina, composicao: comp,
    camadas: c.pagina.camadas.map((l) => (l.tipo === "imagem" && l.asset_id === anterior ? { ...l, asset_id: assetId } : l)) } };
}

/** True when a proposal has an image slot that can receive an AI image (any strategy, not only AI_IMAGE_COMPOSITION). */
export const aceitaImagemIA = (c: CandidatoRedesign) => c.pagina.camadas.some((l) => l.tipo === "imagem");

/**
 * Turns any proposal with an image slot into an AI-image proposal for THAT layout: geometry, text region,
 * overlay and effects stay; the image layer points to the placeholder and a prompt is built for the slot.
 */
export function converterParaIA(c: CandidatoRedesign, pacote: PacoteProva, sistema: SistemaVisual): CandidatoRedesign {
  if (c.requiresAiImage || !aceitaImagemIA(c)) return c;
  const comp = (c.pagina.composicao ?? {}) as ComposicaoImagem;
  const s = pacote.conteudo.slides.find((x) => x.id === c.pagina.slide);
  const modo: ModoImagem = comp.modo && comp.modo !== "none" ? comp.modo : "contained";
  const regiao: RegiaoTexto = comp.regiao ?? (modo === "hero" ? "bottom" : "left");
  const promptIA = construirPromptComposicao({ titulo: s?.titulo ?? "", texto: s?.texto, intencao: comp.visual_intent, papel: (c.pagina.papel as PapelVisual) ?? "standard",
    estilo: c.estilo, variante: sistema.variante, paleta: sistema.paleta, modo, regiao });
  return { ...c, requiresAiImage: true, pendente: true, promptIA,
    pagina: { ...c.pagina, composicao: { ...comp, asset_id: ASSET_IA_PENDENTE, origem: "kie", visual_prompt: promptIA } as Record<string, unknown>,
      camadas: c.pagina.camadas.map((l) => (l.tipo === "imagem" ? { ...l, asset_id: ASSET_IA_PENDENTE } : l)) } };
}

/** Replaces only page `indice` of variant `v`; everything else (other pages, content, system) is untouched. */
export function aplicarCandidato(p: PacoteProva, v: Variante, indice: number, c: CandidatoRedesign): PacoteProva {
  const d = p.variantes[v];
  return { ...p, variantes: { ...p.variantes, [v]: { ...d, paginas: d.paginas.map((x, i) => (i === indice ? c.pagina : x)) } } };
}
