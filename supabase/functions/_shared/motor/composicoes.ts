// Per-page compositions and visual rhythm. Pure: browser, tests and the Deno worker share it.
// A composition only repositions/re-colours existing layers of ONE page: text stays literal (same ref/ids),
// images keep asset_id and box proportions, manual layers are untouched, font sizes are never reduced.
import { ALTURA, LARGURA, layoutTexto, resolverTexto, type Camada, type CamadaForma, type CamadaImagem, type CamadaTexto, type ConteudoEditorial, type Medidor, type Pagina } from "../documento-grafico/nucleo.ts";

export type ComposicaoId = "editorial" | "tipografico" | "paineis" | "contraste" | "assimetrica";
export const COMPOSICOES: ReadonlyArray<{ id: ComposicaoId; nome: string; descricao: string }> = [
  { id: "editorial", nome: "Editorial", descricao: "Régua de cor, título e texto alinhados à esquerda." },
  { id: "tipografico", nome: "Destaque tipográfico", descricao: "Título e texto centrados, com muito espaço." },
  { id: "paineis", nome: "Painéis divididos", descricao: "Painel de cor (ou a tua imagem) em cima, texto em baixo." },
  { id: "contraste", nome: "Bloco de contraste", descricao: "Título e texto dentro de um bloco escuro ou de cor." },
  { id: "assimetrica", nome: "Assimétrica", descricao: "Faixa vertical de cor e texto deslocado." },
];

/** Engine decorations recognised by estilos.ts (kept to these ids so styles still restyle them). */
const DECOR = new Set(["faixa", "regua", "bloco"]);
const M = 96;
const LIMITE_TEXTO = 1210; // page number band starts at 1250

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const HEX = /^#[0-9a-f]{6}$/i;
/** WCAG contrast ratio between two #rrggbb colours (1 when either is not a plain hex). */
export function contraste(a: string, b: string): number {
  if (!HEX.test(a) || !HEX.test(b)) return 1;
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const sobre = (fundo: string) => (contraste("#16181d", fundo) >= contraste("#ffffff", fundo) ? "#16181d" : "#ffffff");
/** Keeps the colour when it is legible on the fill; otherwise the most legible of ink/white. */
const legivel = (cor: string, fill: string, min: number) => (contraste(cor, fill) >= min ? cor : sobre(fill));

interface Partes {
  titulo?: CamadaTexto; corpo?: CamadaTexto; num?: CamadaTexto;
  imagens: CamadaImagem[]; decor: CamadaForma[]; outras: Camada[]; fundoImagem: boolean;
}
function partes(p: Pagina): Partes {
  const r: Partes = { imagens: [], decor: [], outras: [], fundoImagem: false };
  for (const c of p.camadas) {
    if (c.tipo === "texto" && c.ref?.endsWith(".titulo") && !r.titulo) r.titulo = c;
    else if (c.tipo === "texto" && c.ref?.endsWith(".texto") && !r.corpo) r.corpo = c;
    else if (c.tipo === "texto" && c.id === "num" && !r.num) r.num = c;
    else if (c.tipo === "imagem") { if (c.w >= LARGURA && c.h >= ALTURA) r.fundoImagem = true; r.imagens.push(c); }
    else if (c.tipo === "forma" && DECOR.has(c.id)) r.decor.push(c);
    else r.outras.push(c);
  }
  return r;
}

/** Height a text needs at its own size in a given width (measured when a Medidor is available). */
function alturaTexto(c: CamadaTexto | undefined, w: number, conteudo: ConteudoEditorial, m?: Medidor): number {
  if (!c) return 0;
  const texto = resolverTexto(c, conteudo);
  if (!texto.trim()) return Math.ceil(c.estilo.tam * c.estilo.linha) + 8;
  if (m) {
    const l = layoutTexto(texto, { ...c.estilo, overflow: "cortar", maxLinhas: undefined }, w, 100_000, m);
    return Math.ceil(l.linhas.length * l.alturaLinha) + 8;
  }
  const porLinha = Math.max(1, Math.floor(w / (c.estilo.tam * 0.55)));
  const linhas = texto.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / porLinha)), 0);
  return Math.ceil(linhas * c.estilo.tam * c.estilo.linha) + 8;
}

/** Fits an image box (keeping its proportions) inside a slot, centred. */
function encaixar(img: CamadaImagem, x: number, y: number, w: number, h: number): CamadaImagem {
  const r = img.w / img.h;
  const ww = Math.min(w, h * r), hh = ww / r;
  return { ...img, x: Math.round(x + (w - ww) / 2), y: Math.round(y + (h - hh) / 2), w: Math.round(ww), h: Math.round(hh), z: 3 };
}

export interface OpcaoComposicao {
  id: ComposicaoId; nome: string; descricao: string; pagina: Pagina;
  /** false when some text would not fit at its current size. */
  cabe: boolean;
  /** Lowest text/fill contrast; null when the text sits on a photo (cannot be verified). */
  contrasteMin: number | null;
  /** Each text checked against the real fill behind it, with its own WCAG minimum (3 for large text, 4.5 for body). */
  contrastes: ContrasteElemento[];
}
export interface ContrasteElemento { elemento: "título" | "texto" | "número da página"; razao: number; minimo: number }
/** Elements whose contrast is below their own minimum. */
export const contrastesFracos = (o: Pick<OpcaoComposicao, "contrastes">) => o.contrastes.filter((c) => c.razao < c.minimo);
/** Formats a ratio rounding DOWN (2 decimals) so 4.47 never shows as 4.5. */
export const formatarRazao = (r: number) => (Math.floor(r * 100) / 100).toFixed(2).replace(".", ",");

const ret = (id: string, x: number, y: number, w: number, h: number, cor: string, z = 1, raio = 0): CamadaForma =>
  ({ id, tipo: "forma", forma: "ret", x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z, estilo: { cor, raio } });

/**
 * Builds one composition of a page. Returns null when the page has no editorial text to compose
 * (e.g. a page made only of manual layers).
 */
export function comporPagina(p: Pagina, id: ComposicaoId, conteudo: ConteudoEditorial, m?: Medidor): OpcaoComposicao | null {
  const q = partes(p);
  if (!q.titulo && !q.corpo) return null;
  const fundo = HEX.test(p.fundo) ? p.fundo : "#ffffff";
  const corTitulo = q.titulo?.estilo.cor ?? "#16181d";
  const corCorpo = q.corpo?.estilo.cor ?? corTitulo;
  const destaqueBruto = q.decor.find((d) => contraste(d.estilo.cor, fundo) >= 1.5)?.estilo.cor ?? corTitulo;
  const destaque = HEX.test(destaqueBruto) ? destaqueBruto : corTitulo;
  const contrastes: ContrasteElemento[] = [];
  let cabe = true;
  const decor: CamadaForma[] = [];
  let imagens = q.imagens;
  const colocar = (c: CamadaTexto | undefined, x: number, y: number, w: number, alinh: CamadaTexto["estilo"]["alinh"], fill: string, min: number, hMax?: number): CamadaTexto | undefined => {
    if (!c) return undefined;
    const h = alturaTexto(c, w, conteudo, m);
    const disponivel = hMax ?? LIMITE_TEXTO - y;
    if (h > disponivel || y < 0) cabe = false;
    const cor = q.fundoImagem ? c.estilo.cor : legivel(c.estilo.cor, fill, min);
    if (!q.fundoImagem) contrastes.push({ elemento: c === q.titulo ? "título" : "texto", razao: contraste(cor, fill), minimo: min });
    return { ...c, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.max(1, Math.round(Math.min(h, Math.max(disponivel, 1)))), estilo: { ...c.estilo, alinh, cor } };
  };
  let t: CamadaTexto | undefined, b: CamadaTexto | undefined;
  let numX = M, numAlinh: CamadaTexto["estilo"]["alinh"] = "esq";
  const hT = (w: number) => alturaTexto(q.titulo, w, conteudo, m);
  const hB = (w: number) => alturaTexto(q.corpo, w, conteudo, m);
  const espaco = q.titulo && q.corpo ? 44 : 0;

  switch (id) {
    case "editorial": {
      decor.push(ret("regua", M, 120, 80, 10, destaque, 2));
      t = colocar(q.titulo, M, 170, LARGURA - 2 * M, "esq", fundo, 3);
      b = colocar(q.corpo, M, 170 + (q.titulo ? hT(LARGURA - 2 * M) : 0) + espaco, LARGURA - 2 * M, "esq", fundo, 4.5);
      break;
    }
    case "tipografico": {
      const w = LARGURA - 2 * 120;
      const total = hT(w) + espaco + hB(w);
      const y0 = Math.max(200, Math.round((ALTURA - total) / 2) - 20);
      decor.push(ret("faixa", (LARGURA - 120) / 2, y0 - 64, 120, 12, destaque, 2));
      t = colocar(q.titulo, 120, y0, w, "centro", fundo, 3);
      b = colocar(q.corpo, 120, y0 + (q.titulo ? hT(w) : 0) + espaco, w, "centro", fundo, 4.5);
      numX = (LARGURA - 200) / 2; numAlinh = "centro";
      break;
    }
    case "paineis": {
      const img = imagens.find((i) => !(i.w >= LARGURA && i.h >= ALTURA));
      const wIn = LARGURA - 2 * 112;
      if (img) {
        const alto = 600;
        imagens = imagens.map((i) => (i === img ? encaixar(i, 48, 48, LARGURA - 96, alto) : i));
        t = colocar(q.titulo, M, 48 + alto + 56, LARGURA - 2 * M, "esq", fundo, 3);
        b = colocar(q.corpo, M, 48 + alto + 56 + (q.titulo ? hT(LARGURA - 2 * M) : 0) + espaco, LARGURA - 2 * M, "esq", fundo, 4.5);
      } else {
        const alto = Math.min(760, Math.max(480, hT(wIn) + 200));
        decor.push(ret("bloco", 48, 48, LARGURA - 96, alto, destaque, 1, 24));
        t = colocar(q.titulo, 112, 48 + alto - 80 - Math.min(hT(wIn), alto - 160), wIn, "esq", destaque, 3, alto - 160);
        b = colocar(q.corpo, M, 48 + alto + 64, LARGURA - 2 * M, "esq", fundo, 4.5);
      }
      break;
    }
    case "contraste": {
      const caixa = contraste(corTitulo, fundo) >= 3 ? corTitulo : destaque;
      const wIn = LARGURA - 2 * 136;
      const alto = Math.min(ALTURA - 260, 80 + hT(wIn) + espaco + hB(wIn) + 80);
      const y0 = Math.max(120, Math.round((ALTURA - alto) / 2) - 30);
      decor.push(ret("bloco", 72, y0, LARGURA - 144, alto, caixa, 1, 24));
      const fimCaixa = y0 + alto - 80;
      t = colocar(q.titulo, 136, y0 + 80, wIn, "esq", caixa, 3, fimCaixa - (y0 + 80));
      const yB = y0 + 80 + (q.titulo ? hT(wIn) : 0) + espaco;
      b = colocar(q.corpo, 136, yB, wIn, "esq", caixa, 4.5, fimCaixa - yB);
      break;
    }
    case "assimetrica": {
      const x = 312, w = LARGURA - x - M;
      decor.push(ret("bloco", 0, 0, 240, ALTURA, destaque, 1, 0));
      t = colocar(q.titulo, x, 200, w, "esq", fundo, 3);
      const yB = 200 + (q.titulo ? hT(w) : 0) + espaco;
      b = colocar(q.corpo, x, yB, w, "esq", fundo, 4.5);
      const img = imagens.find((i) => !(i.w >= LARGURA && i.h >= ALTURA));
      const yImg = yB + (q.corpo ? hB(w) : 0) + 40;
      if (img && LIMITE_TEXTO - yImg >= 220) imagens = imagens.map((i) => (i === img ? encaixar(i, x, yImg, w, LIMITE_TEXTO - yImg) : i));
      numX = x;
      break;
    }
  }
  const fillNum = id === "assimetrica" && numX < 240 ? destaque : fundo;
  const num = q.num ? { ...q.num, x: Math.round(numX), y: 1250, w: 200, h: q.num.h, estilo: { ...q.num.estilo, alinh: numAlinh, cor: q.fundoImagem ? q.num.estilo.cor : legivel(q.num.estilo.cor, fillNum, 3) } } : undefined;
  if (num && !q.fundoImagem) contrastes.push({ elemento: "número da página", razao: contraste(num.estilo.cor, fillNum), minimo: 3 });
  const camadas: Camada[] = [...decor, ...imagens, ...q.outras, ...[t, b, num].filter((c): c is CamadaTexto => !!c)];
  const meta = COMPOSICOES.find((c) => c.id === id)!;
  void corCorpo;
  return { ...meta, pagina: { ...p, camadas }, cabe, contrasteMin: q.fundoImagem || !contrastes.length ? null : Math.min(...contrastes.map((c) => c.razao)), contrastes: q.fundoImagem ? [] : contrastes };
}

/** The five compositions of one page (empty when the page has no editorial text). */
export function composicoesPagina(p: Pagina, conteudo: ConteudoEditorial, m?: Medidor): OpcaoComposicao[] {
  return COMPOSICOES.map((c) => comporPagina(p, c.id, conteudo, m)).filter((o): o is OpcaoComposicao => !!o);
}

// ---------------- visual rhythm ----------------

export type Ritmo = "dado_chave" | "definicao" | "exemplo" | "comparacao" | "passos" | "destaque";
export const NOME_RITMO: Record<Ritmo, string> = {
  dado_chave: "Dado-chave", definicao: "Definição", exemplo: "Exemplo ou caso", comparacao: "Duas perspetivas", passos: "Passos", destaque: "Destaque",
};
export interface SlideRitmo { papel: string; titulo: string; texto: string; fontes: number[] }

const NUMERO = /(?<![\w/])\d+(?:[.,]\d+)?\s?(?:%|€|mil\b|milhões\b|M\b|k\b)?/g;
const COMPARA = /\b(?:versus|vs\.?|por um lado|por outro lado|em contraste|ao contrário|enquanto que)\b/i;
const DEFINE = /\b(?:significa|define-se|consiste em|refere-se a)\b|^[^.!?]{2,80}\s(?:é|são)\s(?:um|uma|o|a|os|as)\s/i;
const EXEMPLO = /\b(?:por exemplo|exemplo|caso de|estudo de caso)\b/i;
const MARCA_LISTA = /(?:^|\n)\s*(?:\d{1,2}[.)]|[-•–])\s+\S/g;

function numeros(s: string): Set<string> {
  return new Set((s.match(NUMERO) ?? []).map((n) => n.replace(/\s/g, "").replace(",", ".")).filter((n) => !/^\d$/.test(n.replace(/\D/g, "")) || /%|€/.test(n)));
}

/**
 * Conservative rhythm per slide, backed by the slide text AND the paragraphs it cites. Capa/fecho → null.
 * Never invents meaning: without evidence the slide is "destaque".
 */
export function ritmoSlide(s: SlideRitmo, paragrafos: string[]): Ritmo | null {
  if (s.papel === "capa" || s.papel === "fecho") return null;
  const citados = s.fontes.map((n) => paragrafos[n - 1]).filter((x): x is string => typeof x === "string");
  const fonte = citados.join("\n");
  const alvo = `${s.titulo}\n${s.texto}`;
  if (!citados.length) return "destaque";
  const nFonte = numeros(fonte);
  if ([...numeros(alvo)].some((n) => nFonte.has(n))) return "dado_chave";
  if (COMPARA.test(alvo) && COMPARA.test(fonte)) return "comparacao";
  if ((s.texto.match(MARCA_LISTA) ?? []).length >= 3 || (citados.length >= 3 && citados.every((c) => c.length <= 160))) return "passos";
  if (DEFINE.test(s.titulo) || DEFINE.test(s.texto.split(/(?<=[.!?])\s/)[0] ?? "")) return "definicao";
  if (EXEMPLO.test(alvo) && EXEMPLO.test(fonte)) return "exemplo";
  return "destaque";
}

const POR_RITMO: Record<Ritmo, ComposicaoId> = {
  dado_chave: "tipografico", definicao: "contraste", exemplo: "paineis", comparacao: "paineis", passos: "editorial", destaque: "assimetrica",
};
const ALTERNATIVAS: ComposicaoId[] = ["editorial", "assimetrica", "contraste", "tipografico", "paineis"];

/** Composition per slide (null = keep capa/fecho as composed), never the same one twice in a row. */
export function planoRitmo(slides: SlideRitmo[], paragrafos: string[]): Array<{ ritmo: Ritmo | null; composicao: ComposicaoId | null }> {
  let anterior: ComposicaoId | null = null;
  return slides.map((s) => {
    const ritmo = ritmoSlide(s, paragrafos);
    if (!ritmo) { anterior = null; return { ritmo, composicao: null }; }
    let c = POR_RITMO[ritmo];
    if (c === anterior) c = ALTERNATIVAS.find((a) => a !== anterior && a !== "paineis") ?? c;
    anterior = c;
    return { ritmo, composicao: c };
  });
}

/** Applies a rhythm plan to the pages of one document (pages without editorial text stay as they are). */
export function aplicarRitmo(paginas: Pagina[], plano: ReturnType<typeof planoRitmo>, conteudo: ConteudoEditorial, m?: Medidor): Pagina[] {
  return paginas.map((p, i) => {
    const c = plano[i]?.composicao;
    if (!c) return p;
    const o = comporPagina(p, c, conteudo, m);
    return o && o.cabe ? o.pagina : p;
  });
}
