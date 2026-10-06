/**
 * Content engine — editorial proposal (independent of design) and A/B composition.
 * Pure and dependency-free: imported by the browser (preview, editor), tests and the Deno worker.
 */
import { aplicarRitmo, planoRitmo } from "./composicoes.ts";
import { ALTURA, FONTE_DOC, LARGURA, PAPEIS_PAGINA, type Camada, type DocumentoGrafico, type PacoteProva, type Pagina, type Variante } from "../documento-grafico/nucleo.ts";

export const LIMITES_FONTE = { min: 40, max: 20000, minSlides: 2, maxSlides: 10 } as const;
export const MODELO_ESTRUTURACAO = "estruturacao-local";
export const MODELO_DEMO = "simulado-demo";
/** The deterministic demo provider only accepts the synthetic test fixture. */
export const MARCADOR_FIXTURE = "[R3-FIXTURE]";
export const MARCADOR_FALHA = "[R3-FALHA-APOS-CHECKPOINT]";

export type Papel = "capa" | "contexto" | "desenvolvimento" | "fecho";

export interface SlideProposta {
  id: string;
  papel: Papel;
  titulo: string;
  texto: string;
  /** 1-based paragraph numbers of the normalised source backing this slide. */
  fontes: number[];
  /** Visual role decided by the narrative from the slide's function in the story (optional for older proposals). */
  papel_visual?: string;
  /** Semantic visual intent (not search terms, not a prompt); feeds Pexels terms and the AI prompt. */
  tema_visual?: string;
}

export interface PropostaEditorial {
  v: 1;
  metodo: "estruturacao" | "demonstracao" | "ia";
  demonstracao: boolean;
  titulo: string;
  objetivo: string;
  tom: string;
  slides: SlideProposta[];
  legenda: string;
  alt: string[];
  citacao: { titulo: string | null; url: string | null };
  marca: { cor: string; origem: "projeto" | "neutra" };
  /** Per-slide provenance after a hybrid merge: slide id -> framework job that supplied its text. */
  origem_slides?: Record<string, { framework: string; trabalho: string }>;
  /** Set on single-slide regenerations: only this slide id differs from the base; never usable as a whole proposal. */
  escopo_slide?: string;
}

export interface FonteNormalizada {
  paragrafos: string[];
  texto: string;
  caracteres: number;
}

export interface Brief {
  objetivo?: string;
  tom?: string;
  slides?: number;
  titulo?: string | null;
  /** Optional narrative framework (see frameworks.ts); absent = original editorial prompt. */
  framework?: string | null;
  /** Author-voice snapshot taken at job creation (absent on older jobs). */
  autor?: Record<string, unknown> | null;
  /** Per-job angle + optional specific reading. */
  briefing?: Record<string, unknown> | null;
  idioma_saida?: string;
  traducao?: { id: string; hash_original: string; idioma_origem: string } | null;
  leitura_trabalho?: { angulo: string | null; especifica: string } | null;
  /** True when the objective is the author's own reading. */
  leitura?: boolean;
  base_versao?: number | null;
  origem_trabalho?: string | null;
  /** Single-slide regeneration request (see regenerar.ts). */
  regen?: import("./regenerar.ts").RegenBrief | null;
}

/** Normalise pasted text: unify line endings/spaces, strip list numbering, one paragraph per block. */
export function normalizarFonte(bruto: string): FonteNormalizada {
  const limpo = bruto.replace(/\r\n?/g, "\n").replace(/[\t\u00a0 ]+/g, " ").replace(/\u200b/g, "");
  const blocos = limpo.split(/\n\s*\n|\n(?=\s*(?:\d{1,3}[.)]|[-•–])\s)/);
  const paragrafos = blocos
    .map((b) => b.replace(/\n/g, " ").replace(/^\s*(?:\d{1,3}[.)]|[-•–])\s+/, "").replace(/ {2,}/g, " ").trim())
    .filter((p) => p.length > 0);
  const texto = paragrafos.join("\n\n");
  return { paragrafos, texto, caracteres: texto.length };
}

export interface Avaliacao { ok: boolean; motivo?: string; slidesSugeridos: number; slidesMax: number }

/** A PT-PT translation of a source already accepted under the limit may grow; this margin keeps it accepted. */
export const MARGEM_TRADUCAO = 1.3;

/** Explains limits instead of imposing an arbitrary minimum length. */
export function avaliarFonte(f: FonteNormalizada, opcoes?: { traducao?: boolean }): Avaliacao {
  const max = opcoes?.traducao ? Math.ceil(LIMITES_FONTE.max * MARGEM_TRADUCAO) : LIMITES_FONTE.max;
  if (f.caracteres < LIMITES_FONTE.min) return { ok: false, motivo: `O texto tem ${f.caracteres} caracteres; são precisos pelo menos ${LIMITES_FONTE.min} para haver um facto a apresentar.`, slidesSugeridos: 0, slidesMax: 0 };
  if (f.caracteres > max) return { ok: false, motivo: `O texto tem ${f.caracteres.toLocaleString("pt-PT")} caracteres; o limite é ${max.toLocaleString("pt-PT")}. Divide-o em partes.`, slidesSugeridos: 0, slidesMax: 0 };
  const slidesMax = Math.min(LIMITES_FONTE.maxSlides, f.paragrafos.length + 2);
  const slidesSugeridos = Math.max(LIMITES_FONTE.minSlides, Math.min(slidesMax, Math.ceil(f.caracteres / 350) + 2));
  return { ok: true, slidesSugeridos, slidesMax: Math.max(LIMITES_FONTE.minSlides, slidesMax) };
}

function primeiraFrase(p: string): [string, string] {
  const m = p.match(/^(.{20,220}?[.!?…])(\s+|$)(.*)$/s);
  if (!m) return [p, ""];
  return [m[1].trim(), m[3].trim()];
}

const COR = /^#[0-9a-fA-F]{6}$/;
export const COR_NEUTRA = "#334155";

export function marcaDoProjeto(cor: string | null | undefined): PropostaEditorial["marca"] {
  return cor && COR.test(cor) ? { cor: cor.toLowerCase(), origem: "projeto" } : { cor: COR_NEUTRA, origem: "neutra" };
}

/**
 * Deterministic structuring without AI: every sentence comes verbatim from the source,
 * slides cite their paragraphs, nothing is invented or summarised.
 */
export function estruturarSemIa(f: FonteNormalizada, brief: Brief, citacao: PropostaEditorial["citacao"], marca: PropostaEditorial["marca"]): PropostaEditorial {
  const n = Math.max(LIMITES_FONTE.minSlides, Math.min(LIMITES_FONTE.maxSlides, brief.slides ?? avaliarFonte(f).slidesSugeridos));
  const paras = f.paragrafos.map((t, i) => ({ t, n: i + 1 }));
  const [capaTitulo, capaResto] = brief.titulo?.trim() ? [brief.titulo.trim(), paras[0]?.t ?? ""] : primeiraFrase(paras[0]?.t ?? "");
  const usadosCapa = brief.titulo?.trim() ? [] : [1];
  const restantes = brief.titulo?.trim() ? paras : (capaResto ? [{ t: capaResto, n: 1 }, ...paras.slice(1)] : paras.slice(1));
  const meio = Math.max(0, n - 2);
  const grupos: { t: string; n: number }[][] = [];
  if (meio > 0 && restantes.length > 0) {
    const porSlide = Math.ceil(restantes.length / Math.min(meio, restantes.length));
    for (let i = 0; i < restantes.length; i += porSlide) grupos.push(restantes.slice(i, i + porSlide));
  }
  const slides: SlideProposta[] = [{ id: "s1", papel: "capa", titulo: capaTitulo, texto: "", fontes: usadosCapa }];
  grupos.forEach((g, i) => {
    const [titulo, resto] = primeiraFrase(g[0].t);
    const texto = [resto, ...g.slice(1).map((x) => x.t)].filter(Boolean).join("\n\n");
    slides.push({ id: `s${slides.length + 1}`, papel: i === 0 ? "contexto" : "desenvolvimento", titulo, texto, fontes: [...new Set(g.map((x) => x.n))] });
  });
  const ref = [citacao.titulo, citacao.url].filter(Boolean).join(" — ");
  slides.push({ id: `s${slides.length + 1}`, papel: "fecho", titulo: "Fonte", texto: ref || "Texto fornecido pelo autor.", fontes: [] });
  return {
    v: 1, metodo: "estruturacao", demonstracao: false,
    titulo: capaTitulo, objetivo: (brief.objetivo ?? "").slice(0, 200), tom: (brief.tom ?? "").slice(0, 80),
    slides,
    legenda: [capaTitulo, ref ? `Fonte: ${ref}` : ""].filter(Boolean).join("\n\n").slice(0, 2200),
    alt: slides.map((s, i) => `Slide ${i + 1} de ${slides.length}: ${s.titulo}`.slice(0, 250)),
    citacao, marca,
  };
}

/** Deterministic simulated "AI" response (demo only; fixture-restricted by the worker). */
export function respostaDemo(f: FonteNormalizada, brief: Brief): string {
  const p = estruturarSemIa(f, brief, { titulo: "Fixture sintética R3", url: null }, { cor: COR_NEUTRA, origem: "neutra" });
  return JSON.stringify({ titulo: p.titulo, slides: p.slides, legenda: `Demonstração: ${p.legenda}`.slice(0, 2200) });
}

/** Validates a provider response: facts must cite existing paragraphs; injected rules are ignored (data only). */
export const MODELO_IA = "deepseek-flash";

/** Validates a model answer against the source. Throws a short, model-facing error (used for the single repair). */
export function validarRespostaModelo(raw: string, f: FonteNormalizada, slidesPedidos?: number): { titulo: string; slides: SlideProposta[]; legenda: string; alt: string[] | null } {
  let v: unknown;
  const limpo = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { v = JSON.parse(limpo); } catch { throw new Error("A resposta não é JSON válido."); }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("A resposta tem de ser um objeto JSON.");
  const o = v as { titulo?: unknown; slides?: unknown; legenda?: unknown; alt?: unknown };
  if (typeof o.titulo !== "string" || !o.titulo.trim()) throw new Error("Falta 'titulo'.");
  if (!Array.isArray(o.slides)) throw new Error("Falta 'slides'.");
  if (typeof o.legenda !== "string" || !o.legenda.trim()) throw new Error("Falta 'legenda'.");
  if (o.slides.length < LIMITES_FONTE.minSlides || o.slides.length > LIMITES_FONTE.maxSlides) throw new Error(`Número de slides fora de ${LIMITES_FONTE.minSlides}–${LIMITES_FONTE.maxSlides}.`);
  if (slidesPedidos && o.slides.length !== slidesPedidos) throw new Error(`Pedidos ${slidesPedidos} slides, recebidos ${o.slides.length}.`);
  if (o.legenda.length > 2200) throw new Error("'legenda' com mais de 2200 caracteres.");
  const papeis: Papel[] = ["capa", "contexto", "desenvolvimento", "fecho"];
  const slides = o.slides.map((s, i) => {
    const x = (s ?? {}) as Record<string, unknown>;
    if (typeof x.titulo !== "string" || typeof x.texto !== "string" || !Array.isArray(x.fontes)) throw new Error(`Slide ${i + 1}: faltam titulo/texto/fontes.`);
    if (!x.titulo.trim()) throw new Error(`Slide ${i + 1}: título vazio.`);
    if (x.texto.length > 1500 || x.titulo.length > 300) throw new Error(`Slide ${i + 1} demasiado longo.`);
    const papel = papeis.includes(x.papel as Papel) ? (x.papel as Papel) : "desenvolvimento";
    const fontes = [...new Set(x.fontes as unknown[])];
    for (const n of fontes) if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > f.paragrafos.length) throw new Error(`Slide ${i + 1}: referência §${String(n)} não existe (fonte tem ${f.paragrafos.length} parágrafos).`);
    if (papel !== "fecho" && fontes.length === 0) throw new Error(`Slide ${i + 1}: falta referência aos parágrafos da fonte.`);
    const pv = typeof x.papel_visual === "string" && PAPEIS_PAGINA.includes(x.papel_visual) && (i === 0) === (x.papel_visual === "cover") ? x.papel_visual : undefined;
    return { id: `s${i + 1}`, papel, titulo: x.titulo.trim(), texto: x.texto.trim(), fontes: (fontes as number[]).sort((a, b) => a - b), ...(pv ? { papel_visual: pv } : {}), ...(typeof x.tema_visual === "string" && x.tema_visual.trim() ? { tema_visual: x.tema_visual.trim().slice(0, 240) } : {}) };
  });
  let alt: string[] | null = null;
  if (Array.isArray(o.alt) && o.alt.length === slides.length && o.alt.every((a) => typeof a === "string" && a.trim())) alt = (o.alt as string[]).map((a) => a.trim().slice(0, 250));
  return { titulo: o.titulo.trim().slice(0, 300), slides, legenda: o.legenda.trim(), alt };
}

export function validarProposta(v: unknown): PropostaEditorial {
  const p = v as PropostaEditorial;
  if (!p || p.v !== 1 || !Array.isArray(p.slides) || p.slides.length < 1 || p.slides.length > 20) throw new Error("Proposta editorial inválida.");
  for (const s of p.slides) if (typeof s.id !== "string" || typeof s.titulo !== "string" || typeof s.texto !== "string") throw new Error("Slide inválido na proposta.");
  return p;
}

// ---------- composition ----------

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const sobre = (fundo: string) => (lum(fundo) > 0.4 ? "#111111" : "#ffffff");

function tamTitulo(t: string, capa: boolean): number {
  const n = t.length;
  if (capa) return n < 50 ? 84 : n < 90 ? 70 : n < 140 ? 58 : 48;
  return n < 50 ? 60 : n < 100 ? 50 : 42;
}
function tamTexto(t: string): number {
  const n = t.length;
  return n < 160 ? 40 : n < 320 ? 34 : n < 520 ? 30 : 28;
}

const txt = (id: string, ref: string, x: number, y: number, w: number, h: number, tam: number, peso: 400 | 700, cor: string, alinh: "esq" | "centro" = "esq", z = 10): Camada => ({
  id, tipo: "texto", ref, x, y, w, h, z, estilo: { peso, familia: peso === 700 ? "montserrat" : "inter", tam, linha: peso === 700 ? 1.12 : 1.38, alinh, cor, overflow: "cortar", tamMin: tam },
});
const ret = (id: string, x: number, y: number, w: number, h: number, cor: string, z = 1, raio = 0, opacidade?: number): Camada => ({
  id, tipo: "forma", forma: "ret", x, y, w, h, z, opacidade, estilo: { cor, raio },
});
const numeroPagina = (i: number, total: number, cor: string, x: number, alinh: "esq" | "centro"): Camada => ({
  id: `num`, tipo: "texto", texto: `${i + 1}/${total}`, x, y: 1250, w: 200, h: 44, z: 20,
  estilo: { peso: 400, familia: "inter", tam: 26, linha: 1.2, alinh, cor, overflow: "cortar", tamMin: 26 },
});

/** Variant A — "Editorial claro": light page, accent rule, left-aligned hierarchy. */
function paginaA(s: SlideProposta, i: number, total: number, cor: string): Pagina {
  const claro = "#f7f6f2";
  const tinta = "#16181d";
  if (s.papel === "capa") {
    const t = sobre(cor);
    return { id: `a-${s.id}`, slide: s.id, fundo: cor, camadas: [
      ret("faixa", 96, 180, 120, 12, t, 2),
      txt("titulo", `${s.id}.titulo`, 96, 240, 888, 760, tamTitulo(s.titulo, true), 700, t),
      txt("texto", `${s.id}.texto`, 96, 1020, 888, 200, 34, 400, t),
      numeroPagina(i, total, t, 96, "esq"),
    ] };
  }
  const tt = tamTitulo(s.titulo, false);
  const alturaTitulo = Math.min(420, Math.ceil(s.titulo.length / (tt > 55 ? 23 : 28)) * tt * 1.12 + 20);
  return { id: `a-${s.id}`, slide: s.id, fundo: claro, camadas: [
    ret("regua", 96, 120, 80, 10, cor, 2),
    txt("titulo", `${s.id}.titulo`, 96, 170, 888, alturaTitulo, tt, 700, tinta),
    txt("texto", `${s.id}.texto`, 96, 170 + alturaTitulo + 40, 888, 1180 - (170 + alturaTitulo + 40), tamTexto(s.texto), 400, "#2b2f36"),
    numeroPagina(i, total, "#6b7280", 96, "esq"),
  ] };
}

/** Variant B — "Bloco de cor": dark page, accent block, centred cover and boxed body. */
function paginaB(s: SlideProposta, i: number, total: number, cor: string): Pagina {
  const escuro = "#121417";
  if (s.papel === "capa") {
    return { id: `b-${s.id}`, slide: s.id, fundo: escuro, camadas: [
      ret("bloco", 0, 0, LARGURA, 360, cor, 1),
      txt("titulo", `${s.id}.titulo`, 120, 420, 840, 620, tamTitulo(s.titulo, true), 700, "#ffffff", "centro"),
      txt("texto", `${s.id}.texto`, 120, 1060, 840, 160, 32, 400, "#d1d5db", "centro"),
      numeroPagina(i, total, "#9ca3af", 440, "centro"),
    ] };
  }
  const t = sobre(cor);
  const tt = tamTitulo(s.titulo, false);
  const alturaTitulo = Math.min(380, Math.ceil(s.titulo.length / (tt > 55 ? 21 : 26)) * tt * 1.12 + 20);
  return { id: `b-${s.id}`, slide: s.id, fundo: escuro, camadas: [
    ret("bloco", 72, 96, 936, alturaTitulo + 80, cor, 1, 24),
    txt("titulo", `${s.id}.titulo`, 112, 136, 856, alturaTitulo, tt, 700, t),
    txt("texto", `${s.id}.texto`, 96, 96 + alturaTitulo + 130, 888, 1180 - (96 + alturaTitulo + 130), tamTexto(s.texto), 400, "#e5e7eb"),
    numeroPagina(i, total, "#9ca3af", 440, "centro"),
  ] };
}

/**
 * Composes both variants. With the source paragraphs, inner pages follow a conservative visual rhythm
 * (composicoes.ts); without them (or when a rhythm page would not fit) the classic layout is kept.
 */
export function comporDocumentos(p: PropostaEditorial, paragrafos?: string[]): Record<Variante, DocumentoGrafico> {
  const total = p.slides.length;
  const conteudo = { slides: p.slides.map((s) => ({ id: s.id, titulo: s.titulo, texto: s.texto })) };
  const plano = paragrafos ? planoRitmo(p.slides, paragrafos) : null;
  const doc = (variante: Variante, f: typeof paginaA): DocumentoGrafico => {
    const base = p.slides.map((s, i) => f(s, i, total, p.marca.cor));
    const paginas = (plano ? aplicarRitmo(base, plano, conteudo) : base).map((pg, i) => {
      const pv = p.slides[i]?.papel_visual, tv = p.slides[i]?.tema_visual;
      const comPapel = pv && PAPEIS_PAGINA.includes(pv) ? { ...pg, papel: pv } : pg;
      return tv ? { ...comPapel, composicao: { ...(comPapel.composicao ?? {}), visual_intent: tv } } : comPapel;
    });
    return { v: 1, variante, largura: LARGURA, altura: ALTURA, fonte: FONTE_DOC, paginas };
  };
  return { A: doc("A", paginaA), B: doc("B", paginaB) };
}

/** Builds the editor package (shared text + both variants). Not synthetic: real persisted work. */
export function paraPacote(id: string, nome: string, p: PropostaEditorial, docs: Record<Variante, DocumentoGrafico>): PacoteProva {
  return {
    v: 1, id, nome, sintetico: false,
    conteudo: { slides: p.slides.map((s) => ({ id: s.id, titulo: s.titulo, texto: s.texto })) },
    assets: {}, variantes: docs,
  };
}

/** Merges editor text back into the proposal, preserving roles, citations and caption. */
export function aplicarTextoNaProposta(p: PropostaEditorial, pacote: PacoteProva): PropostaEditorial {
  const porId = new Map(pacote.conteudo.slides.map((s) => [s.id, s]));
  const slides = p.slides.map((s) => {
    const e = porId.get(s.id);
    return e ? { ...s, titulo: e.titulo, texto: e.texto } : s;
  });
  return { ...p, slides, titulo: slides[0]?.titulo ?? p.titulo };
}
