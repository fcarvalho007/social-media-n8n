// "Redesenhar slide": composition exploration for ONE page. Deterministic, no AI, no network.
// Every candidate is produced by the same aplicarSistema used by the canvas and export, so a candidate's
// page is exactly what enters the document if applied. Content (texts/refs) is never changed.
import { resolverTexto, type Camada, type ConteudoEditorial, type Medidor, type PacoteProva, type Pagina, type Variante } from "../documento-grafico/nucleo.ts";
import type { EstiloId } from "./estilos.ts";
import type { ComposicaoImagem, ModoImagem, PapelVisual, RegiaoTexto, TipoOverlay } from "./imagem.ts";
import { aplicarSistema, geradaPeloSistema, type SistemaVisual } from "./sistema.ts";
import type { OverrideEfeitos } from "./efeitos.ts";

export type EstrategiaRedesign = "TYPOGRAPHY_LED" | "EDITORIAL_SPLIT" | "PHOTO_HERO" | "FULL_BLEED" | "OVERLAP" | "MINIMAL" | "CALLOUT" | "CONTAINED" | "EXPLORE";
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
  for (const rc of receitas) {
    if (saida.length >= n) break;
    const comp: ComposicaoImagem = { ...comp0, ...rc.comp, ...(papel ? { papel } : {}), ...(rc.comp.modo !== "none" && asset ? { asset_id: asset } : {}),
      ...(rc.efeitos ? { efeitos: { ...(comp0.efeitos ?? {}), ...rc.efeitos } } : {}), estrategia: rc.strategy };
    const pg: Pagina = { ...orig, composicao: comp as Record<string, unknown>, camadas: orig.camadas.map((c) => (c.manual ? (({ manual: _m, ...x }) => x as Camada)(c) : c)) };
    const p: PacoteProva = { ...o.pacote, variantes: { ...o.pacote.variantes, [o.variante]: { ...doc, paginas: doc.paginas.map((x, i) => (i === o.indice ? pg : x)) } } };
    const sis = { ...o.sistema, ...(rc.estilo ? { estilo: rc.estilo } : {}), imagens: "auto" as const };
    let res;
    try { res = aplicarSistema(p, sis, o.m, [o.indice], {}, { ajustes: "recriar", variantes: [o.variante] }); } catch { continue; }
    if (res.recusadas.length || res.imagemRecusadas.length) continue; // never shrink: refuse what does not fit
    const nova = res.pacote.variantes[o.variante].paginas[o.indice];
    if (hashConteudo(nova, o.pacote.conteudo) !== hash0) continue;
    const sig = assinatura(nova);
    if (vistos.has(sig)) continue;
    vistos.add(sig);
    saida.push({ id: `${rc.strategy}-${saida.length}-${o.ronda ?? 0}`, strategy: rc.strategy, label: rc.label, reason: rc.reason,
      pagina: { ...nova, camadas: nova.camadas.map(marcarManual) }, estilo: sis.estilo, requiresAiImage: false, estimatedCost: null });
  }
  const sugerirIA = !asset && (papel === "cover" || papel === "visual_story" || papel === "concept");
  const aviso = saida.length < n ? `Só ${saida.length} composição(ões) realmente diferente(s) cabem neste slide${asset ? "" : " sem imagem"}.` : undefined;
  return { candidatos: saida, sugerirIA, aviso };
}

/** Replaces only page `indice` of variant `v`; everything else (other pages, content, system) is untouched. */
export function aplicarCandidato(p: PacoteProva, v: Variante, indice: number, c: CandidatoRedesign): PacoteProva {
  const d = p.variantes[v];
  return { ...p, variantes: { ...p.variantes, [v]: { ...d, paginas: d.paginas.map((x, i) => (i === indice ? c.pagina : x)) } } };
}
