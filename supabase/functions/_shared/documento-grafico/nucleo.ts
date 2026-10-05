/**
 * DocumentoGrafico v1 — canonical, editor-independent carousel document.
 * Dependency-free on purpose: the same file is imported by the browser editor
 * (Vite), by tests (Bun/Vitest) and by the Deno render function, so text layout,
 * crop maths and SVG output are computed by exactly the same code everywhere.
 */

export const LARGURA = 1080;
export const ALTURA = 1350;
export const FAMILIA = "Work Sans";
export const FONTE_DOC = "WorkSans@1";

export type Peso = 400 | 700 | 900;
/** Font families a text layer may use (all embedded in browser and server). Absent = Work Sans (legacy). */
export const FAMILIAS = ["worksans", "montserrat", "inter", "playfair", "sourcesans", "grotesk", "dmserif", "dmsans", "plex"] as const;
export type Familia = (typeof FAMILIAS)[number];
export const NOME_FAMILIA: Record<Familia, string> = {
  worksans: "Work Sans", montserrat: "Montserrat", inter: "Inter", playfair: "Playfair Display", sourcesans: "Source Sans 3",
  grotesk: "Space Grotesk", dmserif: "DM Serif Display", dmsans: "DM Sans", plex: "IBM Plex Sans",
};
/** Title/body pairs offered in the Design step. */
export const PARES_FONTES: ReadonlyArray<{ id: string; nome: string; titulo: Familia; corpo: Familia }> = [
  { id: "montserrat-inter", nome: "Montserrat + Inter", titulo: "montserrat", corpo: "inter" },
  { id: "playfair-source", nome: "Playfair + Source Sans", titulo: "playfair", corpo: "sourcesans" },
  { id: "grotesk-inter", nome: "Space Grotesk + Inter", titulo: "grotesk", corpo: "inter" },
  { id: "dmserif-dmsans", nome: "DM Serif + DM Sans", titulo: "dmserif", corpo: "dmsans" },
  { id: "plex", nome: "IBM Plex Sans", titulo: "plex", corpo: "plex" },
  { id: "worksans", nome: "Work Sans", titulo: "worksans", corpo: "worksans" },
];
export type Alinhamento = "esq" | "centro" | "dir";

interface CamadaBase {
  id: string;
  nome?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  opacidade?: number;
}

export interface EstiloTexto {
  peso: Peso;
  familia?: Familia;
  tam: number;
  linha: number;
  alinh: Alinhamento;
  cor: string;
  maxLinhas?: number;
  overflow: "reduzir" | "cortar";
  tamMin?: number;
  /** Drop cap derived from the first letter at render time; the text itself is never changed. */
  capitular?: boolean;
}

export interface CamadaTexto extends CamadaBase {
  tipo: "texto";
  /** Reference to shared editorial content, e.g. "s1.titulo". */
  ref?: string;
  /** Explicit override used only when there is no ref. */
  texto?: string;
  estilo: EstiloTexto;
}

export interface CamadaImagem extends CamadaBase {
  tipo: "imagem";
  asset_id: string;
  recorte: "cover" | "contain";
  /** Focal point 0..1 used by "cover". */
  foco?: { x: number; y: number };
  /** Shared clip shape (same geometry in canvas and SVG). */
  mascara?: Mascara;
}

export type Mascara = "diagonal" | "arco";
export const MASCARAS: readonly Mascara[] = ["diagonal", "arco"];
type Cmd = ["M" | "L", number, number] | ["Q", number, number, number, number] | ["Z"];
/** Mask outline in layer-local coordinates; the only geometry source for both renderers. */
export function comandosMascara(m: Mascara, w: number, h: number): Cmd[] {
  return m === "diagonal"
    ? [["M", 0, 0], ["L", w, 0], ["L", w, h * 0.72], ["L", 0, h], ["Z"]]
    : [["M", 0, 0], ["L", w, 0], ["L", w, h * 0.8], ["Q", w / 2, h * 1.12, 0, h * 0.8], ["Z"]];
}
export function caminhoMascara(m: Mascara, w: number, h: number, dx = 0, dy = 0): string {
  return comandosMascara(m, w, h).map((c) => c[0] === "Z" ? "Z" : c[0] === "Q" ? `Q${c[1] + dx} ${c[2] + dy} ${c[3] + dx} ${c[4] + dy}` : `${c[0]}${c[1] + dx} ${c[2] + dy}`).join("");
}
/** Traces the mask on any canvas-like context (Konva clipFunc). */
export function tracarMascara(ctx: { beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; quadraticCurveTo(a: number, b: number, c: number, d: number): void; closePath(): void }, m: Mascara, w: number, h: number) {
  ctx.beginPath();
  for (const c of comandosMascara(m, w, h)) {
    if (c[0] === "M") ctx.moveTo(c[1], c[2]);
    else if (c[0] === "L") ctx.lineTo(c[1], c[2]);
    else if (c[0] === "Q") ctx.quadraticCurveTo(c[1], c[2], c[3], c[4]);
    else ctx.closePath();
  }
}

/** Closed set of vector icons (24×24 viewBox, filled, even-odd). Drawn identically in canvas and SVG. */
export const ICONES = {
  seta: "M4 11h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6H4z",
  check: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z",
  grafico: "M3 21h18v-2H3zM5 17h3V9H5zM10.5 17h3V4h-3zM16 17h3v-6h-3z",
  estrela: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  alvo: "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zm0 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14zm0 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8z",
  info: "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM11 10h2v7h-2zm0-4h2v2h-2z",
  lampada: "M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2zM9 19h6v2H9z",
} as const;
export type IconeId = keyof typeof ICONES;

export interface CamadaForma extends CamadaBase {
  tipo: "forma";
  /** "gradiente": vertical fade from transparent (top) to `cor` (bottom); "icone": vector icon `estilo.icone`. */
  forma: "ret" | "elipse" | "gradiente" | "icone";
  estilo: { cor: string; raio?: number; icone?: IconeId };
}

/** Hex #rrggbb + alpha → rgba() string. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export type Camada = CamadaTexto | CamadaImagem | CamadaForma;

export interface Pagina {
  id: string;
  slide?: string;
  fundo: string;
  camadas: Camada[];
}

export type Variante = "A" | "B";

export interface DocumentoGrafico {
  v: 1;
  variante: Variante;
  largura: typeof LARGURA;
  altura: typeof ALTURA;
  fonte: typeof FONTE_DOC;
  paginas: Pagina[];
}

export interface SlideEditorial {
  id: string;
  titulo: string;
  texto: string;
}

export interface ConteudoEditorial {
  slides: SlideEditorial[];
}

export interface Asset {
  id: string;
  mime: "image/png" | "image/jpeg";
  largura: number;
  altura: number;
  /** Base64 without data: prefix. */
  dados: string;
}

export interface PacoteProva {
  v: 1;
  id: string;
  nome: string;
  /** true for test fixtures; false for persisted real work (never mixed). */
  sintetico: boolean;
  conteudo: ConteudoEditorial;
  assets: Record<string, Asset>;
  variantes: Record<Variante, DocumentoGrafico>;
}

// ---------- validation ----------

const COR = /^#[0-9a-fA-F]{6}$/;
const LIMITE_PAGINAS = 20;
const LIMITE_CAMADAS = 60;

function falha(msg: string): never {
  throw new Error(msg);
}
function obj(v: unknown, onde: string): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) falha(`${onde}: formato inválido.`);
  return v as Record<string, unknown>;
}
function num(v: unknown, onde: string, min = -10000, max = 10000): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) falha(`${onde}: número inválido.`);
  return v;
}
function str(v: unknown, onde: string, max = 5000): string {
  if (typeof v !== "string" || v.length > max) falha(`${onde}: texto inválido.`);
  return v;
}
function cor(v: unknown, onde: string): string {
  if (typeof v !== "string" || !COR.test(v)) falha(`${onde}: cor inválida (usa #rrggbb).`);
  return v;
}

function validarCamada(v: unknown, onde: string, assets: Record<string, Asset>): Camada {
  const c = obj(v, onde);
  const base = {
    id: str(c.id, `${onde}.id`, 80),
    nome: c.nome === undefined ? undefined : str(c.nome, `${onde}.nome`, 80),
    x: num(c.x, `${onde}.x`),
    y: num(c.y, `${onde}.y`),
    w: num(c.w, `${onde}.w`, 1, 10000),
    h: num(c.h, `${onde}.h`, 1, 10000),
    z: num(c.z, `${onde}.z`, -1000, 1000),
    opacidade: c.opacidade === undefined ? undefined : num(c.opacidade, `${onde}.opacidade`, 0, 1),
  };
  if (c.tipo === "texto") {
    const e = obj(c.estilo, `${onde}.estilo`);
    if (e.peso !== 400 && e.peso !== 700 && e.peso !== 900) falha(`${onde}.estilo.peso: usa 400, 700 ou 900.`);
    if (e.alinh !== "esq" && e.alinh !== "centro" && e.alinh !== "dir") falha(`${onde}.estilo.alinh inválido.`);
    if (e.overflow !== "reduzir" && e.overflow !== "cortar") falha(`${onde}.estilo.overflow inválido.`);
    if (c.ref === undefined && c.texto === undefined) falha(`${onde}: texto sem ref nem conteúdo.`);
    return {
      ...base,
      tipo: "texto",
      ref: c.ref === undefined ? undefined : str(c.ref, `${onde}.ref`, 80),
      texto: c.texto === undefined ? undefined : str(c.texto, `${onde}.texto`),
      estilo: {
        peso: e.peso,
        familia: e.familia === undefined ? undefined : (FAMILIAS as readonly string[]).includes(e.familia as string) ? e.familia as Familia : falha(`${onde}.estilo.familia: tipo de letra não suportado.`),
        tam: num(e.tam, `${onde}.estilo.tam`, 6, 400),
        linha: num(e.linha, `${onde}.estilo.linha`, 0.8, 3),
        alinh: e.alinh,
        cor: cor(e.cor, `${onde}.estilo.cor`),
        maxLinhas: e.maxLinhas === undefined ? undefined : num(e.maxLinhas, `${onde}.estilo.maxLinhas`, 1, 100),
        overflow: e.overflow,
        tamMin: e.tamMin === undefined ? undefined : num(e.tamMin, `${onde}.estilo.tamMin`, 6, 400),
        capitular: e.capitular === undefined ? undefined : e.capitular === true ? true : e.capitular === false ? false : falha(`${onde}.estilo.capitular inválido.`),
      },
    };
  }
  if (c.tipo === "imagem") {
    const id = str(c.asset_id, `${onde}.asset_id`, 80);
    if (!assets[id]) falha(`${onde}: recurso "${id}" não existe no pacote.`);
    if (c.recorte !== "cover" && c.recorte !== "contain") falha(`${onde}.recorte inválido.`);
    const f = c.foco === undefined ? undefined : obj(c.foco, `${onde}.foco`);
    return {
      ...base,
      tipo: "imagem",
      asset_id: id,
      recorte: c.recorte,
      foco: f ? { x: num(f.x, `${onde}.foco.x`, 0, 1), y: num(f.y, `${onde}.foco.y`, 0, 1) } : undefined,
      mascara: c.mascara === undefined ? undefined : (MASCARAS as readonly unknown[]).includes(c.mascara) ? c.mascara as Mascara : falha(`${onde}.mascara inválida.`),
    };
  }
  if (c.tipo === "forma") {
    if (c.forma !== "ret" && c.forma !== "elipse" && c.forma !== "gradiente" && c.forma !== "icone") falha(`${onde}.forma inválida.`);
    const e = obj(c.estilo, `${onde}.estilo`);
    if (c.forma === "icone" && !(typeof e.icone === "string" && e.icone in ICONES)) falha(`${onde}.estilo.icone inválido.`);
    return {
      ...base,
      tipo: "forma",
      forma: c.forma,
      estilo: { cor: cor(e.cor, `${onde}.estilo.cor`), raio: e.raio === undefined ? undefined : num(e.raio, `${onde}.estilo.raio`, 0, 1000), icone: c.forma === "icone" ? e.icone as IconeId : undefined },
    };
  }
  return falha(`${onde}: tipo de camada desconhecido.`);
}

function validarDocumento(v: unknown, variante: Variante, assets: Record<string, Asset>): DocumentoGrafico {
  const d = obj(v, `variante ${variante}`);
  if (d.v !== 1) falha(`variante ${variante}: versão não suportada.`);
  if (d.variante !== variante) falha(`variante ${variante}: identificador trocado.`);
  if (d.largura !== LARGURA || d.altura !== ALTURA) falha(`variante ${variante}: dimensões têm de ser 1080×1350.`);
  if (d.fonte !== FONTE_DOC) falha(`variante ${variante}: tipo de letra não suportado.`);
  if (!Array.isArray(d.paginas) || d.paginas.length < 1 || d.paginas.length > LIMITE_PAGINAS) falha(`variante ${variante}: entre 1 e ${LIMITE_PAGINAS} páginas.`);
  const paginas = d.paginas.map((p, i) => {
    const po = obj(p, `página ${i + 1}`);
    if (!Array.isArray(po.camadas) || po.camadas.length > LIMITE_CAMADAS) falha(`página ${i + 1}: camadas inválidas.`);
    return {
      id: str(po.id, `página ${i + 1}.id`, 80),
      slide: po.slide === undefined ? undefined : str(po.slide, `página ${i + 1}.slide`, 80),
      fundo: cor(po.fundo, `página ${i + 1}.fundo`),
      camadas: po.camadas.map((c, j) => validarCamada(c, `página ${i + 1}, camada ${j + 1}`, assets)),
    };
  });
  return { v: 1, variante, largura: LARGURA, altura: ALTURA, fonte: FONTE_DOC, paginas };
}

/** Strict validation of an imported/received package. Throws Error with a pt-PT message. */
export function validarPacote(v: unknown, opcoes: { real?: boolean } = {}): PacoteProva {
  const p = obj(v, "pacote");
  if (p.v !== 1) falha("pacote: versão não suportada.");
  if (!opcoes.real && p.sintetico !== true) falha("pacote: a prova só aceita documentos sintéticos.");
  if (opcoes.real && p.sintetico === true) falha("pacote: um documento de teste não pode entrar num trabalho real.");
  const conteudo = obj(p.conteudo, "conteúdo");
  if (!Array.isArray(conteudo.slides) || conteudo.slides.length > LIMITE_PAGINAS) falha("conteúdo: slides inválidos.");
  const slides = conteudo.slides.map((s, i) => {
    const so = obj(s, `slide ${i + 1}`);
    return { id: str(so.id, `slide ${i + 1}.id`, 80), titulo: str(so.titulo, `slide ${i + 1}.titulo`, 400), texto: str(so.texto, `slide ${i + 1}.texto`, 3000) };
  });
  const ao = obj(p.assets, "recursos");
  const assets: Record<string, Asset> = {};
  for (const [k, a] of Object.entries(ao)) {
    const x = obj(a, `recurso ${k}`);
    if (x.mime !== "image/png" && x.mime !== "image/jpeg") falha(`recurso ${k}: só PNG ou JPEG.`);
    const dados = str(x.dados, `recurso ${k}.dados`, 8_400_000);
    if (!/^[A-Za-z0-9+/=]+$/.test(dados)) falha(`recurso ${k}: dados inválidos.`);
    assets[k] = { id: k, mime: x.mime, largura: num(x.largura, `recurso ${k}.largura`, 1, 8000), altura: num(x.altura, `recurso ${k}.altura`, 1, 8000), dados };
  }
  const vo = obj(p.variantes, "variantes");
  return {
    v: 1,
    id: str(p.id, "pacote.id", 80),
    nome: str(p.nome, "pacote.nome", 120),
    sintetico: !opcoes.real,
    conteudo: { slides },
    assets,
    variantes: { A: validarDocumento(vo.A, "A", assets), B: validarDocumento(vo.B, "B", assets) },
  };
}

// ---------- text ----------

export function resolverTexto(c: CamadaTexto, conteudo: ConteudoEditorial): string {
  if (c.ref) {
    const [sid, campo] = c.ref.split(".");
    const s = conteudo.slides.find((x) => x.id === sid);
    if (s && (campo === "titulo" || campo === "texto")) return s[campo];
    return "";
  }
  return c.texto ?? "";
}

/** Minimal font interface satisfied by opentype.js Font. */
export interface FonteOT {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  stringToGlyphs(texto: string): GlifoOT[];
  charToGlyph(c: string): GlifoOT;
  getKerningValue(a: GlifoOT, b: GlifoOT): number | undefined;
}

export interface ComandoOT {
  type: string;
  x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number;
}

export interface GlifoOT {
  advanceWidth?: number;
  getPath(x: number, y: number, tamanho: number): { commands: ComandoOT[] };
}

/**
 * Explicit, fully separated path serialisation. opentype.js toPathData() emits
 * compacted numbers that Chromium's Path2D misparses at some positions (dropped
 * glyphs); a glyph with any non-finite coordinate is skipped entirely.
 */
export function serializarCaminho(cmds: ComandoOT[]): string {
  const n = (v: number | undefined) => {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("nan");
    return (Math.round(v * 100) / 100).toString();
  };
  try {
    return cmds.map((c) => {
      switch (c.type) {
        case "M": case "L": return `${c.type} ${n(c.x)} ${n(c.y)} `;
        case "Q": return `Q ${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)} `;
        case "C": return `C ${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)} `;
        case "Z": return "Z ";
        default: throw new Error("cmd");
      }
    }).join("");
  } catch {
    return "";
  }
}

export interface Medidor {
  largura(texto: string, tam: number, peso: Peso, familia?: Familia): number;
  ascendente(peso: Peso, familia?: Familia): number;
  descendente(peso: Peso, familia?: Familia): number;
  /** Glyph outlines as SVG path data: identical geometry for canvas and SVG output. */
  caminho(texto: string, x: number, baseline: number, tam: number, peso: Peso, familia?: Familia): string;
  /** Families with loaded files (Work Sans always). */
  familias: Familia[];
}

/**
 * Glyph positions computed here (advance + pair kerning, undefined/NaN treated as 0).
 * opentype.js getPath() can emit NaN for some GPOS pairs, which browsers reject
 * mid-path; doing the walk ourselves keeps canvas and SVG output identical.
 */
function posicionar(f: FonteOT, texto: string, tam: number, cada?: (g: GlifoOT, x: number) => void): number {
  const esc = tam / f.unitsPerEm;
  let glifos: GlifoOT[];
  // Some fonts (e.g. Inter/Montserrat) use GSUB lookups opentype.js cannot apply; fall back to plain
  // per-character glyphs (no ligatures) — identical on browser and server, so measurement and render stay equal.
  try { glifos = f.stringToGlyphs(texto); } catch { glifos = Array.from(texto, (c) => f.charToGlyph(c)); }
  let x = 0;
  for (let i = 0; i < glifos.length; i++) {
    const g = glifos[i];
    cada?.(g, x);
    const av = Number(g.advanceWidth);
    x += (Number.isFinite(av) ? av : 0) * esc;
    if (i < glifos.length - 1) {
      const k = Number(f.getKerningValue(g, glifos[i + 1]));
      if (Number.isFinite(k)) x += k * esc;
    }
  }
  return x;
}

export function criarMedidor(fontes: Record<400 | 700, FonteOT>, extras: Partial<Record<Familia, Partial<Record<Peso, FonteOT>>>> = {}): Medidor {
  // Missing weight of a family falls back to its other weight; unknown family falls back to Work Sans.
  const f = (peso: Peso, fam?: Familia): FonteOT => {
    const x = fam && fam !== "worksans" ? extras[fam] : undefined;
    // 900 (Black) falls back to 700 when the family has no Black file.
    if (peso === 900) return x?.[900] ?? x?.[700] ?? x?.[400] ?? fontes[700];
    return x?.[peso] ?? x?.[peso === 400 ? 700 : 400] ?? fontes[peso];
  };
  return {
    familias: ["worksans", ...(Object.keys(extras) as Familia[])],
    largura: (t, tam, peso, fam) => posicionar(f(peso, fam), t, tam),
    ascendente: (peso, fam) => f(peso, fam).ascender / f(peso, fam).unitsPerEm,
    descendente: (peso, fam) => Math.abs(f(peso, fam).descender) / f(peso, fam).unitsPerEm,
    caminho: (t, x, y, tam, peso, fam) => {
      const partes: string[] = [];
      posicionar(f(peso, fam), t, tam, (g, gx) => {
        const d = serializarCaminho(g.getPath(x + gx, y, tam).commands);
        if (d) partes.push(d);
      });
      return partes.join("");
    },
  };
}

export interface LinhaTexto {
  texto: string;
  x: number;
  baseline: number;
  largura: number;
}

export interface LayoutTexto {
  tam: number;
  alturaLinha: number;
  linhas: LinhaTexto[];
  cortado: boolean;
  /** Drop cap glyph (the first letter of the text, removed from the first line, never duplicated). */
  capitular?: { texto: string; tam: number; x: number; baseline: number; largura: number };
}

const LINHAS_CAP = 3;
/** First letter + rest when a drop cap applies (left aligned, starts with a letter, first paragraph long enough). */
export function partirCapitular(texto: string, e: Pick<EstiloTexto, "capitular" | "alinh">): { letra: string; resto: string } | null {
  if (!e.capitular || e.alinh !== "esq") return null;
  const m = /^(\p{L})(\S)/u.exec(texto);
  const p1 = texto.split("\n")[0];
  if (!m || p1.length < 80) return null;
  return { letra: m[1], resto: texto.slice(1) };
}

function quebrar(texto: string, tam: number, peso: Peso, max: number, m: Medidor, fam?: Familia): string[] {
  const out: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    const palavras = paragrafo.split(/ +/).filter((p) => p.length > 0);
    if (palavras.length === 0) {
      out.push("");
      continue;
    }
    let atual = "";
    for (const palavra of palavras) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (m.largura(tentativa, tam, peso, fam) <= max) {
        atual = tentativa;
        continue;
      }
      if (atual) out.push(atual);
      // Hard-break a single word longer than the box.
      let resto = palavra;
      while (m.largura(resto, tam, peso, fam) > max && resto.length > 1) {
        let n = resto.length - 1;
        while (n > 1 && m.largura(resto.slice(0, n), tam, peso, fam) > max) n--;
        out.push(resto.slice(0, n));
        resto = resto.slice(n);
      }
      atual = resto;
    }
    out.push(atual);
  }
  return out;
}

/** Deterministic layout used by both the editor canvas and the SVG renderer. */
export function layoutTexto(texto: string, e: EstiloTexto, w: number, h: number, m: Medidor): LayoutTexto {
  const tamMin = Math.min(e.tamMin ?? 24, e.tam);
  let tam = e.tam;
  let linhas: string[] = [];
  let cabem = 0;
  for (;;) {
    const lh = tam * e.linha;
    linhas = quebrar(texto, tam, e.peso, w, m, e.familia);
    cabem = Math.max(1, Math.min(e.maxLinhas ?? Infinity, Math.floor((h + 0.001) / lh)));
    if (linhas.length <= cabem || e.overflow !== "reduzir" || tam <= tamMin) break;
    tam = Math.max(tamMin, tam - 2);
  }
  // Drop cap: first N lines are indented by the cap width; text is the same string minus its first letter.
  let cap: LayoutTexto["capitular"];
  let recuadas = 0;
  const pc = partirCapitular(texto, e);
  if (pc) {
    const lh0 = tam * e.linha;
    const capTam = Math.round(((LINHAS_CAP - 1) * lh0) / 0.7 + tam);
    const largura = m.largura(pc.letra, capTam, e.peso, e.familia);
    const ind = largura + tam * 0.35;
    const [p1, ...outros] = pc.resto.split("\n");
    const estreitas = quebrar(p1, tam, e.peso, w - ind, m, e.familia);
    if (estreitas.length >= LINHAS_CAP) {
      const resto = estreitas.slice(LINHAS_CAP).join(" ");
      const nl = [...estreitas.slice(0, LINHAS_CAP), ...(resto ? quebrar(resto, tam, e.peso, w, m, e.familia) : []), ...(outros.length ? quebrar(outros.join("\n"), tam, e.peso, w, m, e.familia) : [])];
      linhas = nl;
      cabem = Math.max(1, Math.min(e.maxLinhas ?? Infinity, Math.floor((h + 0.001) / lh0)));
      recuadas = LINHAS_CAP;
      cap = { texto: pc.letra, tam: capTam, x: 0, baseline: 0, largura };
      (cap as { ind?: number }).ind = ind;
    }
  }
  let cortado = false;
  if (linhas.length > cabem) {
    cortado = true;
    linhas = linhas.slice(0, cabem);
    let ultima = linhas[cabem - 1];
    while (ultima.length > 0 && m.largura(`${ultima}…`, tam, e.peso, e.familia) > w) ultima = ultima.slice(0, -1).trimEnd();
    linhas[cabem - 1] = `${ultima}…`;
  }
  const lh = tam * e.linha;
  const asc = m.ascendente(e.peso, e.familia) * tam;
  const desc = m.descendente(e.peso, e.familia) * tam;
  const base = (i: number) => i * lh + (lh - (asc + desc)) / 2 + asc;
  const ind = (cap as { ind?: number } | undefined)?.ind ?? 0;
  return {
    tam,
    alturaLinha: lh,
    cortado,
    capitular: cap ? { texto: cap.texto, tam: cap.tam, x: 0, baseline: base(Math.min(recuadas, linhas.length) - 1), largura: cap.largura } : undefined,
    linhas: linhas.map((t, i) => {
      const largura = m.largura(t, tam, e.peso, e.familia);
      const x = e.alinh === "esq" ? (i < recuadas ? ind : 0) : e.alinh === "centro" ? (w - largura) / 2 : w - largura;
      return { texto: t, largura, x, baseline: base(i) };
    }),
  };
}

// ---------- images ----------

export interface Recorte {
  /** Source rectangle in asset pixels. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Destination rectangle relative to the layer box. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export function calcularRecorte(a: { largura: number; altura: number }, c: Pick<CamadaImagem, "w" | "h" | "recorte" | "foco">): Recorte {
  const rA = a.largura / a.altura;
  const rC = c.w / c.h;
  if (c.recorte === "contain") {
    const dw = rA > rC ? c.w : c.h * rA;
    const dh = rA > rC ? c.w / rA : c.h;
    return { sx: 0, sy: 0, sw: a.largura, sh: a.altura, dx: (c.w - dw) / 2, dy: (c.h - dh) / 2, dw, dh };
  }
  const fx = c.foco?.x ?? 0.5;
  const fy = c.foco?.y ?? 0.5;
  const sw = rA > rC ? a.altura * rC : a.largura;
  const sh = rA > rC ? a.altura : a.largura / rC;
  const sx = Math.min(Math.max(fx * a.largura - sw / 2, 0), a.largura - sw);
  const sy = Math.min(Math.max(fy * a.altura - sh / 2, 0), a.altura - sh);
  return { sx, sy, sw, sh, dx: 0, dy: 0, dw: c.w, dh: c.h };
}

// ---------- SVG ----------

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const r = (n: number) => Math.round(n * 100) / 100;

export function camadasOrdenadas(p: Pagina): Camada[] {
  return [...p.camadas].sort((a, b) => a.z - b.z);
}

/** JSON → SVG using the shared layout. Fonts are referenced by family; the renderer must load the same TTFs. */
export function paginaParaSvg(pacote: PacoteProva, variante: Variante, indice: number, m: Medidor): string {
  const pagina = pacote.variantes[variante].paginas[indice];
  if (!pagina) throw new Error("Página inexistente.");
  const partes: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">`,
    `<rect width="${LARGURA}" height="${ALTURA}" fill="${pagina.fundo}"/>`,
  ];
  for (const c of camadasOrdenadas(pagina)) {
    const op = c.opacidade ?? 1;
    if (c.tipo === "forma") {
      if (c.forma === "gradiente") {
        const gid = `g-${esc(c.id)}-${Math.round(c.y)}`;
        partes.push(`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.estilo.cor}" stop-opacity="0"/><stop offset="1" stop-color="${c.estilo.cor}" stop-opacity="1"/></linearGradient></defs>`);
        partes.push(`<rect x="${r(c.x)}" y="${r(c.y)}" width="${r(c.w)}" height="${r(c.h)}" fill="url(#${gid})" opacity="${op}"/>`);
      } else if (c.forma === "icone") {
        const d = ICONES[c.estilo.icone ?? "seta"];
        partes.push(`<path transform="translate(${r(c.x)} ${r(c.y)}) scale(${r(c.w / 24)} ${r(c.h / 24)})" d="${d}" fill="${c.estilo.cor}" fill-rule="evenodd" opacity="${op}"/>`);
      } else if (c.forma === "ret") {
        partes.push(`<rect x="${r(c.x)}" y="${r(c.y)}" width="${r(c.w)}" height="${r(c.h)}" rx="${r(c.estilo.raio ?? 0)}" fill="${c.estilo.cor}" opacity="${op}"/>`);
      } else {
        partes.push(`<ellipse cx="${r(c.x + c.w / 2)}" cy="${r(c.y + c.h / 2)}" rx="${r(c.w / 2)}" ry="${r(c.h / 2)}" fill="${c.estilo.cor}" opacity="${op}"/>`);
      }
    } else if (c.tipo === "imagem") {
      const a = pacote.assets[c.asset_id];
      const k = calcularRecorte(a, c);
      let clip = "";
      if (c.mascara) {
        const cid = `m-${esc(c.id)}-${Math.round(c.y)}`;
        partes.push(`<defs><clipPath id="${cid}"><path d="${caminhoMascara(c.mascara, c.w, c.h, c.x, c.y)}"/></clipPath></defs>`);
        clip = ` clip-path="url(#${cid})"`;
      }
      partes.push(
        `<g opacity="${op}"${clip}><svg x="${r(c.x + k.dx)}" y="${r(c.y + k.dy)}" width="${r(k.dw)}" height="${r(k.dh)}" viewBox="${r(k.sx)} ${r(k.sy)} ${r(k.sw)} ${r(k.sh)}" preserveAspectRatio="none">` +
          `<image width="${a.largura}" height="${a.altura}" xlink:href="data:${a.mime};base64,${a.dados}"/></svg></g>`,
      );
    } else {
      const lay = layoutTexto(resolverTexto(c, pacote.conteudo), c.estilo, c.w, c.h, m);
      // Text is emitted as glyph outlines from the same font file, so the server
      // does not depend on its own shaping; the editable text stays in the JSON.
      partes.push(`<g opacity="${op}" fill="${c.estilo.cor}"><title>${esc((lay.capitular?.texto ?? "") + lay.linhas.map((l) => l.texto).join(" "))}</title>`);
      if (lay.capitular) partes.push(`<path d="${m.caminho(lay.capitular.texto, c.x + lay.capitular.x, c.y + lay.capitular.baseline, lay.capitular.tam, c.estilo.peso, c.estilo.familia)}"/>`);
      for (const l of lay.linhas) {
        if (!l.texto) continue;
        partes.push(`<path d="${m.caminho(l.texto, c.x + l.x, c.y + l.baseline, lay.tam, c.estilo.peso, c.estilo.familia)}"/>`);
      }
      partes.push(`</g>`);
    }
  }
  partes.push(`</svg>`);
  return partes.join("");
}

/** Text layers whose content does not fit their box (same layout as render; font is never shrunk). */
export function transbordos(pacote: PacoteProva, variante: Variante, m: Medidor): Array<{ pagina: number; titulo: boolean }> {
  const out: Array<{ pagina: number; titulo: boolean }> = [];
  pacote.variantes[variante].paginas.forEach((pg, i) => {
    for (const c of pg.camadas) {
      if (c.tipo !== "texto") continue;
      if (layoutTexto(resolverTexto(c, pacote.conteudo), c.estilo, c.w, c.h, m).cortado) out.push({ pagina: i, titulo: !!c.ref?.endsWith("titulo") });
    }
  });
  return out;
}

/** Text layers whose rendered text (not just the box) overlaps another text layer's rendered text on the same page.
 *  Independent of overflow: a title that fits its box can still run into the body below it. */
export function colisoes(pacote: PacoteProva, variante: Variante, m: Medidor, folga = 8): Array<{ pagina: number; a: string; b: string }> {
  const out: Array<{ pagina: number; a: string; b: string }> = [];
  pacote.variantes[variante].paginas.forEach((pg, i) => {
    const caixas = pg.camadas.flatMap((c) => {
      if (c.tipo !== "texto") return [];
      const t = resolverTexto(c, pacote.conteudo);
      if (!t.trim()) return [];
      const l = layoutTexto(t, c.estilo, c.w, c.h, m);
      const alt = Math.min(c.h, l.linhas.length * l.alturaLinha);
      return [{ id: c.id, nome: c.ref?.endsWith("titulo") ? "título" : c.nome ?? "texto", x0: c.x, x1: c.x + c.w, y0: c.y, y1: c.y + alt }];
    });
    for (let a = 0; a < caixas.length; a++) for (let b = a + 1; b < caixas.length; b++) {
      const p = caixas[a], q = caixas[b];
      if (p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 + folga && q.y0 < p.y1 + folga) out.push({ pagina: i, a: p.nome, b: q.nome });
    }
  });
  return out;
}
