// Image composition layer: pageRole + imageMode + textRegion + focal point + overlay → page layers.
// Pure and shared (Design preview, Composition editor, server export, tests): one renderer for every
// image source — the asset origin (library/pexels/upload/kie) never changes the layout.
// Invariants: text is never edited or shrunk; a mode whose text does not fit is refused (page kept as
// the style composed it); manual layers are kept; an image the user placed is never removed by
// "automático" — only an explicit "sem imagem" hides it, and the asset stays in the package.
import {
  ALTURA, LARGURA, layoutTexto, resolverTexto,
  type Camada, type CamadaForma, type CamadaImagem, type CamadaTexto, type ConteudoEditorial, type DirecaoGradiente, type Medidor, type Pagina, type Variante,
} from "../documento-grafico/nucleo.ts";
import type { EstiloId, Paleta } from "./estilos.ts";

export type PapelVisual = "cover" | "standard" | "visual_story" | "data" | "concept" | "comparison" | "case_study" | "transition" | "actions" | "conclusion";
export type ModoImagem = "none" | "full_bleed" | "background" | "hero" | "contained" | "split" | "inset";
export type RegiaoTexto = "top" | "bottom" | "left" | "right" | "center";
export type TipoOverlay = "none" | "gradient" | "vignette" | "glass";
export type OrigemImagem = "library" | "pexels" | "upload" | "kie" | "none";

export const PAPEIS: ReadonlyArray<{ id: PapelVisual; nome: string }> = [
  { id: "cover", nome: "Capa" }, { id: "standard", nome: "Standard" }, { id: "visual_story", nome: "História visual" },
  { id: "data", nome: "Dado" }, { id: "concept", nome: "Conceito" }, { id: "comparison", nome: "Comparação" },
  { id: "case_study", nome: "Caso prático" }, { id: "transition", nome: "Transição" }, { id: "actions", nome: "Ações" },
  { id: "conclusion", nome: "Conclusão" },
];
export const MODOS: ReadonlyArray<{ id: ModoImagem; nome: string }> = [
  { id: "none", nome: "Sem imagem" }, { id: "full_bleed", nome: "Fundo total" }, { id: "hero", nome: "Hero" },
  { id: "contained", nome: "Contida" }, { id: "split", nome: "Dividida" }, { id: "inset", nome: "Destaque pequeno" },
];
export const REGIOES: ReadonlyArray<{ id: RegiaoTexto; nome: string }> = [
  { id: "bottom", nome: "Em baixo" }, { id: "top", nome: "Em cima" }, { id: "left", nome: "À esquerda" }, { id: "right", nome: "À direita" }, { id: "center", nome: "Ao centro" },
];

/** Explicit user choices for one page; absent fields mean "automático". Stored per variant + slide. */
export interface ComposicaoImagem {
  papel?: PapelVisual;
  modo?: ModoImagem;
  regiao?: RegiaoTexto;
  foco?: { x: number; y: number };
  /** "inteira" shows the whole image (contain) instead of filling the frame. */
  ajuste?: "preencher" | "inteira";
  overlay?: TipoOverlay;
  intensidade?: number;
  asset_id?: string | null;
  origem?: OrigemImagem;
  visual_query?: string;
  visual_prompt?: string;
  /** Semantic intent from the narrative; Pexels terms and the AI prompt both derive from it. */
  visual_intent?: string;
  /** Per-page effect overrides (style default when absent). */
  efeitos?: Partial<Record<string, boolean>>;
  /** Redesign strategy that produced this page (informative). */
  estrategia?: string;
}
/** Key `${variante}:${slideId}`. */
export type ComposicoesImagem = Record<string, ComposicaoImagem>;
export const chaveComposicao = (v: Variante, slide: string) => `${v}:${slide}`;

/** Fully resolved decision (what the renderer uses; shown in the panel as "Automático: …"). */
export interface DecisaoImagem { papel: PapelVisual; modo: ModoImagem; regiao: RegiaoTexto; foco: { x: number; y: number }; overlay: TipoOverlay; intensidade: number; razao: string }

const NUM = /\d+([.,]\d+)?\s?(%|€|mil|milhões|x\b)/i;
/** Deterministic role from text and position; never calls AI. */
export function inferirPapel(s: { titulo: string; texto: string }, indice: number, total: number): PapelVisual {
  if (indice === 0) return "cover";
  const t = `${s.titulo}\n${s.texto}`;
  if (indice === total - 1) return /^fonte/i.test(s.titulo.trim()) ? "transition" : "conclusion";
  if (/(?<!\p{L})(vs\.?|versus|em vez de|antes e depois|por um lado)(?!\p{L})/iu.test(t)) return "comparison";
  if ((s.texto.match(/(^|\n)\s*([-•–]|\d+[.)])\s/g) ?? []).length >= 2) return "actions";
  if (NUM.test(s.titulo) || (NUM.test(t) && t.length < 220)) return "data";
  if (/(?<!\p{L})(caso|exemplo|cliente|empresa|cooperativa|equipa|na prática)(?!\p{L})/iu.test(t)) return "case_study";
  if (/(?<!\p{L})(é|significa|define-se|conceito|princípio)(?!\p{L})/iu.test(s.titulo) && t.length < 260) return "concept";
  if (/(?<!\p{L})(mas|agora|então|e depois)(?!\p{L})/iu.test(s.titulo) && t.length < 160) return "transition";
  return t.length < 140 ? "visual_story" : "standard";
}

type Linha = Record<EstiloId, ModoImagem>;
/** Role × style matrix used when an image is available (see plan). Without image → "none". */
export const MATRIZ: Record<PapelVisual, Linha> = {
  cover:        { editorial: "full_bleed", impacto: "split", contraste: "split",     revista: "full_bleed", fotografico: "full_bleed", minimalista: "contained", didatico: "hero" },
  standard:     { editorial: "contained",  impacto: "split", contraste: "split",     revista: "hero",       fotografico: "background", minimalista: "contained", didatico: "contained" },
  visual_story: { editorial: "hero",       impacto: "split", contraste: "split",     revista: "full_bleed", fotografico: "full_bleed", minimalista: "hero",      didatico: "hero" },
  data:         { editorial: "none",       impacto: "none", contraste: "none",      revista: "none",       fotografico: "background", minimalista: "none",      didatico: "none" },
  concept:      { editorial: "none",       impacto: "none", contraste: "none",      revista: "none",       fotografico: "background", minimalista: "none",      didatico: "none" },
  comparison:   { editorial: "none",       impacto: "none", contraste: "none",      revista: "none",       fotografico: "split",      minimalista: "none",      didatico: "none" },
  case_study:   { editorial: "hero",       impacto: "split", contraste: "split",     revista: "hero",       fotografico: "full_bleed", minimalista: "contained", didatico: "hero" },
  transition:   { editorial: "none",       impacto: "none", contraste: "none",      revista: "full_bleed", fotografico: "full_bleed", minimalista: "none",      didatico: "none" },
  actions:      { editorial: "none",       impacto: "none", contraste: "none",      revista: "none",       fotografico: "none",       minimalista: "none",      didatico: "none" },
  conclusion:   { editorial: "contained",  impacto: "none", contraste: "none",      revista: "full_bleed", fotografico: "full_bleed", minimalista: "none",      didatico: "none" },
};

const regiaoPadrao = (modo: ModoImagem, v: Variante): RegiaoTexto =>
  modo === "full_bleed" || modo === "background" ? (v === "A" ? "bottom" : "left")
  : modo === "split" ? (v === "A" ? "left" : "right")
  : modo === "hero" ? (v === "A" ? "bottom" : "top")
  : modo === "contained" ? (v === "A" ? "top" : "bottom")
  : "top";

/**
 * Resolves the automatic decision. An existing user image is never dropped automatically: a role that
 * prefers no photo falls back to "contained" (or "inset" for data) when the page already has one.
 */
export function decidir(o: { papel: PapelVisual; estilo: EstiloId; variante: Variante; temImagem: boolean; chars: number; comp?: ComposicaoImagem }): DecisaoImagem {
  const c = o.comp ?? {};
  const papel = c.papel ?? o.papel;
  let modo: ModoImagem, razao: string;
  if (c.modo) { modo = c.modo; razao = "escolha manual"; }
  else if (!o.temImagem) { modo = "none"; razao = "sem imagem disponível: composição gráfica"; }
  else {
    modo = MATRIZ[papel][o.estilo];
    razao = `${papel} em ${o.estilo}`;
    if (modo === "none") { modo = papel === "data" || papel === "concept" ? "inset" : "contained"; razao += ": a imagem existente fica discreta"; }
    if ((modo === "full_bleed" || modo === "background") && papel !== "cover" && o.chars > 260) { modo = "hero"; razao += "; texto longo → hero"; }
  }
  const regiao = c.regiao ?? regiaoPadrao(modo, o.variante);
  const foco = c.foco ?? (papel === "cover" || modo === "full_bleed" ? { x: 0.5, y: 0.3 } : { x: 0.5, y: 0.4 });
  const overlay = c.overlay ?? (modo === "full_bleed" || modo === "background" ? (regiao === "center" ? "vignette" : "gradient") : modo === "hero" || modo === "split" ? "gradient" : "none");
  const intensidade = c.intensidade ?? (modo === "background" ? 0.9 : modo === "full_bleed" ? 0.88 : 1);
  return { papel, modo, regiao, foco, overlay, intensidade, razao };
}

/** Gradient direction derived from where the text sits (darkest behind the text). */
export const direcaoDaRegiao = (r: RegiaoTexto, overlay: TipoOverlay): DirecaoGradiente =>
  overlay === "vignette" ? (r === "center" ? "centro" : "vinheta") : r === "bottom" ? "base" : r === "top" ? "topo" : r === "left" ? "esquerda" : r === "right" ? "direita" : "centro";

const M = 96, BASE = 1210, GAP = 28;
const BRANCO = "#FFFFFF";

function alturaTexto(c: CamadaTexto, conteudo: ConteudoEditorial, w: number, m?: Medidor): number | null {
  const t = resolverTexto(c, conteudo);
  if (!t.trim()) return Math.ceil(c.estilo.tam * c.estilo.linha);
  if (!m) return Math.ceil(Math.max(1, Math.ceil((t.length * c.estilo.tam * 0.55) / w)) * c.estilo.tam * c.estilo.linha) + 8;
  // Never shrink: measure at the current size only.
  const l = layoutTexto(t, { ...c.estilo, tamMin: c.estilo.tam, maxLinhas: undefined }, w, 4000, m);
  // A word split across lines means the column is too narrow for this size: refuse instead.
  const norm = t.replace(/\s+/g, " ").trim();
  let pos = 0;
  for (let i = 0; i < l.linhas.length - 1; i++) {
    const seg = ((i === 0 && l.capitular ? l.capitular.texto : "") + l.linhas[i].texto).replace(/\s+/g, " ").trim();
    const at = norm.indexOf(seg, pos);
    if (at < 0) break;
    pos = at + seg.length;
    if (pos < norm.length && norm[pos] !== " " && !/[-–—/]$/.test(seg)) return null;
  }
  return Math.ceil(l.linhas.length * l.alturaLinha) + 8;
}

export interface ResultadoImagem { pagina: Pagina; cabe: boolean; decisao: DecisaoImagem; aviso?: string }

/**
 * Re-composes a page (already styled by its model) for the decided image mode. Returns the page
 * unchanged with cabe=false when the text would not fit in the region at its current size.
 */
export function comporImagem(p: Pagina, o: OpcoesImagem): ResultadoImagem | null {
  const r = comporImagemUma(p, o);
  if (!r || r.cabe) return r;
  // Automatic choices that do not fit fall back to roomier layouts; explicit user choices are refused as-is.
  const tentativas: Array<Partial<ComposicaoImagem>> = [];
  if (!o.comp?.regiao && (r.decisao.regiao === "left" || r.decisao.regiao === "right") && r.decisao.modo !== "split")
    tentativas.push({ modo: r.decisao.modo, regiao: o.variante === "B" ? "top" : "bottom" });
  if (!o.comp?.modo && (r.decisao.modo === "split" || r.decisao.modo === "hero"))
    tentativas.push({ modo: "full_bleed", regiao: o.variante === "B" ? "top" : "bottom" }, { modo: "contained" });
  for (const t of tentativas) {
    const alt = comporImagemUma(p, { ...o, comp: { ...o.comp, ...t } });
    if (alt?.cabe) return { ...alt, decisao: { ...alt.decisao, razao: `${r.decisao.razao}; não cabia → ${alt.decisao.modo}` } };
  }
  return r;
}
type OpcoesImagem = Parameters<typeof comporImagemUma>[1];
function comporImagemUma(p: Pagina, o: { altura?: number; indice: number; total: number; estilo: EstiloId; variante: Variante; paleta: Paleta; conteudo: ConteudoEditorial; m?: Medidor; comp?: ComposicaoImagem; assets?: Record<string, unknown>; papel?: PapelVisual }): ResultadoImagem | null {
  const ALTURA = o.altura ?? 1350;
  const BASE = ALTURA === 1920 ? 1570 : 1210;
  const titulo = p.camadas.find((c): c is CamadaTexto => c.tipo === "texto" && !!c.ref?.endsWith(".titulo"));
  const corpo = p.camadas.find((c): c is CamadaTexto => c.tipo === "texto" && !!c.ref?.endsWith(".texto"));
  if (!titulo && !corpo) return null;
  const slideId = (titulo ?? corpo)!.ref!.split(".")[0];
  const s = o.conteudo.slides.find((x) => x.id === slideId) ?? { titulo: "", texto: "" };
  const imagens = p.camadas.filter((c): c is CamadaImagem => c.tipo === "imagem");
  const assetComp = o.comp?.asset_id ?? null;
  // A photo hidden by an explicit "sem imagem" is restored from the remembered asset when the mode changes back.
  const restaurada: CamadaImagem | undefined = !imagens.length && assetComp && o.assets?.[assetComp] && o.comp?.modo !== "none"
    ? { id: `img-${slideId}`, tipo: "imagem", asset_id: assetComp, x: 0, y: 0, w: LARGURA, h: ALTURA, z: 1, recorte: "cover" } : undefined;
  const img = imagens.find((c) => c.asset_id === assetComp) ?? imagens[0] ?? restaurada;
  const d = decidir({ papel: o.papel ?? inferirPapel(s, o.indice, o.total), estilo: o.estilo, variante: o.variante, temImagem: !!img, chars: s.titulo.length + s.texto.length, comp: o.comp });
  if (!img || (d.modo !== "none" && !img)) return { pagina: p, cabe: true, decisao: { ...d, modo: "none" } };

  const textos = [titulo, corpo].filter((c): c is CamadaTexto => !!c);
  const outrasImagens = imagens.filter((c) => c !== img && c !== restaurada);
  const num = p.camadas.find((c) => c.tipo === "texto" && c.id === "num");
  const manuais = p.camadas.filter((c) => c !== num && c.tipo !== "imagem" && !textos.includes(c as CamadaTexto) && !c.id.startsWith("mod-") && c.id !== "faixa" && c.id !== "regua" && c.id !== "bloco");
  const decor = p.camadas.filter((c) => c.tipo === "forma" && (c.id.startsWith("mod-") || c.id === "faixa" || c.id === "regua" || c.id === "bloco")) as CamadaForma[];

  if (d.modo === "none") {
    // Explicit: hide the photo (the asset stays in the package); the style's graphic composition remains.
    return { pagina: { ...p, camadas: p.camadas.filter((c) => c !== img) }, cabe: true, decisao: d };
  }

  const escuro = o.paleta.fundoCapa;
  const zImg = 1, zGrad = 2, zTxt = 5;
  const imagem = (x: number, y: number, w: number, h: number): CamadaImagem =>
    ({ ...img, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z: zImg, recorte: o.comp?.ajuste === "inteira" ? "contain" : "cover", foco: d.foco, mascara: undefined, opacidade: undefined });
  const grad = (x: number, y: number, w: number, h: number, direcao: DirecaoGradiente, cor: string, inicio: number, intensidade: number): CamadaForma =>
    ({ id: "mod-img-grad", tipo: "forma", forma: "gradiente", x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z: zGrad, estilo: { cor, direcao, inicio, intensidade } });

  /** Stacks the text layers inside a box; returns null when they do not fit (never shrinks). */
  const empilhar = (x: number, y0: number, w: number, y1: number, ancora: "topo" | "base" | "centro", cor?: { titulo: string; texto: string }): CamadaTexto[] | null => {
    const hs = textos.map((c) => alturaTexto(c, o.conteudo, w, o.m));
    if (hs.some((h) => h == null)) return null;
    const total = (hs as number[]).reduce((a, b) => a + b, 0) + GAP * (textos.length - 1);
    if (total > y1 - y0) return null;
    let y = ancora === "topo" ? y0 : ancora === "base" ? y1 - total : y0 + (y1 - y0 - total) / 2;
    return textos.map((c, i) => {
      const h = hs[i] as number;
      const t: CamadaTexto = { ...c, x: Math.round(x), y: Math.round(y), w: Math.round(w), h, z: zTxt,
        estilo: { ...c.estilo, alinh: ancora === "centro" && d.regiao === "center" ? "centro" : c.estilo.alinh === "centro" ? "esq" : c.estilo.alinh, ...(cor ? { cor: c === titulo ? cor.titulo : cor.texto } : {}) } };
      y += h + GAP;
      return t;
    });
  };
  const sobreEscuro = { titulo: BRANCO, texto: BRANCO };
  const sobreClaro = { titulo: o.paleta.titulo, texto: o.paleta.texto };

  let novas: Camada[] | null = null;
  let fundo = p.fundo;
  let numCor: string | undefined;
  const r = d.regiao;

  if (d.modo === "full_bleed" || d.modo === "background") {
    const caixa = r === "bottom" ? [M, 640, LARGURA - 2 * M, BASE, "base"] as const
      : r === "top" ? [M, 110, LARGURA - 2 * M, 760, "topo"] as const
      : r === "left" ? [M, 140, 720, BASE, "centro"] as const
      : r === "right" ? [LARGURA - M - 720, 140, 720, BASE, "centro"] as const
      : [M + 40, 200, LARGURA - 2 * M - 80, 1150, "centro"] as const;
    const t = empilhar(caixa[0], caixa[1], caixa[2], caixa[3], caixa[4], sobreEscuro);
    if (t) {
      const glass = d.overlay === "glass";
      const g = d.overlay === "none" ? [] : [grad(0, 0, LARGURA, ALTURA, direcaoDaRegiao(r, glass ? "gradient" : d.overlay), escuro,
        r === "bottom" || r === "top" ? 0.38 : 0.2, glass ? d.intensidade * 0.5 : d.intensidade)];
      // Glass: a translucent palette panel behind the text block (no fixed colour).
      const vidro: Camada[] = glass && t.length ? (() => {
        const x0 = Math.max(24, Math.min(...t.map((c) => c.x)) - 40), y0 = Math.max(24, Math.min(...t.map((c) => c.y)) - 40);
        const x1 = Math.min(LARGURA - 24, Math.max(...t.map((c) => c.x + c.w)) + 40), y1 = Math.min(ALTURA - 24, Math.max(...t.map((c) => c.y + c.h)) + 32);
        return [{ id: "img-glass", tipo: "forma", forma: "ret", x: x0, y: y0, w: x1 - x0, h: y1 - y0, z: Math.min(...t.map((c) => c.z)) - 1, opacidade: Math.min(0.75, 0.25 + d.intensidade * 0.4), estilo: { cor: escuro, raio: 28 } } as Camada];
      })() : [];
      novas = [imagem(0, 0, LARGURA, ALTURA), ...g, ...vidro, ...t];
      fundo = escuro; numCor = BRANCO;
    }
  } else if (d.modo === "hero") {
    const emBaixo = r !== "top"; // text below the image (A) or above it (B)
    const hs = textos.map((c) => alturaTexto(c, o.conteudo, LARGURA - 2 * M, o.m) ?? 9999);
    const precisa = hs.reduce((a, b) => a + b, 0) + GAP * (textos.length - 1);
    const hImg = Math.min(760, BASE - 80 - precisa);
    if (hImg >= 420) {
      const t = emBaixo ? empilhar(M, hImg + 56, LARGURA - 2 * M, BASE, "topo", sobreClaro) : empilhar(M, 110, LARGURA - 2 * M, ALTURA - hImg - 56, "topo", sobreClaro);
      if (t) {
        const yImg = emBaixo ? 0 : ALTURA - hImg;
        // Blend the photo into the page background on the side where the text starts.
        const g = d.overlay === "none" ? [] : [grad(0, emBaixo ? yImg + hImg * 0.55 : yImg, LARGURA, hImg * 0.45, emBaixo ? "base" : "topo", o.paleta.fundo, 0, d.intensidade)];
        novas = [imagem(0, yImg, LARGURA, hImg), ...g, ...t];
        fundo = o.paleta.fundo;
      }
    }
  } else if (d.modo === "contained") {
    // Image shares the text column (same x and width as the text grid).
    const w = LARGURA - 2 * M;
    const hs = textos.map((c) => alturaTexto(c, o.conteudo, w, o.m) ?? 9999);
    const precisa = hs.reduce((a, b) => a + b, 0) + GAP * (textos.length - 1);
    const hImg = Math.min(620, BASE - 110 - precisa - 56);
    if (hImg >= 300) {
      const textoEmCima = r !== "bottom";
      const t = textoEmCima ? empilhar(M, 110, w, 110 + precisa + 1, "topo", sobreClaro) : empilhar(M, 110 + hImg + 56, w, BASE, "topo", sobreClaro);
      if (t) {
        const yImg = textoEmCima ? 110 + precisa + 56 : 110;
        novas = [imagem(M, yImg, w, hImg), ...t];
        fundo = o.paleta.fundo;
      }
    }
  } else if (d.modo === "split") {
    const metade = LARGURA / 2;
    const textoEsq = r !== "right";
    const xT = textoEsq ? 72 : metade + 48;
    const t = empilhar(xT, 140, metade - 120, BASE, "centro", sobreClaro);
    if (t) {
      const xImg = textoEsq ? metade : 0;
      const g = d.overlay === "none" ? [] : [grad(textoEsq ? xImg : metade - 140, 0, 140, ALTURA, textoEsq ? "esquerda" : "direita", o.paleta.fundo, 0, d.intensidade)];
      novas = [imagem(xImg, 0, metade, ALTURA), ...g, ...t];
      fundo = o.paleta.fundo;
    }
  } else if (d.modo === "inset") {
    // Small photo in the corner opposite the text start; the style's text layout stays.
    const w = 300, h = 375;
    const x = o.variante === "A" ? LARGURA - M - w : M;
    const topoTexto = Math.min(...textos.map((c) => c.y));
    if (topoTexto >= 110 + h + 40) novas = [...decor, imagem(x, 110, w, h), ...textos];
    else {
      const t = empilhar(M, 110 + h + 48, LARGURA - 2 * M, BASE, "topo");
      if (t) novas = [...decor.filter((c) => c.y > 110 + h || c.h < 20), imagem(x, 110, w, h), ...t];
    }
  }

  if (!novas) return { pagina: p, cabe: false, decisao: d, aviso: "O texto não cabe neste modo de imagem; o slide fica como estava." };
  const n = num && num.tipo === "texto" ? [{ ...num, z: zTxt, estilo: { ...num.estilo, cor: numCor ?? (d.modo === "inset" ? num.estilo.cor : o.paleta.discreto) } }] : [];
  return { pagina: { ...p, fundo, camadas: [...novas, ...outrasImagens, ...n, ...manuais] }, cabe: true, decisao: d };
}
