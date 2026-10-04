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

export type Peso = 400 | 700;
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
  tam: number;
  linha: number;
  alinh: Alinhamento;
  cor: string;
  maxLinhas?: number;
  overflow: "reduzir" | "cortar";
  tamMin?: number;
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
}

export interface CamadaForma extends CamadaBase {
  tipo: "forma";
  forma: "ret" | "elipse";
  estilo: { cor: string; raio?: number };
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
  sintetico: true;
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
    if (e.peso !== 400 && e.peso !== 700) falha(`${onde}.estilo.peso: usa 400 ou 700.`);
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
        tam: num(e.tam, `${onde}.estilo.tam`, 6, 400),
        linha: num(e.linha, `${onde}.estilo.linha`, 0.8, 3),
        alinh: e.alinh,
        cor: cor(e.cor, `${onde}.estilo.cor`),
        maxLinhas: e.maxLinhas === undefined ? undefined : num(e.maxLinhas, `${onde}.estilo.maxLinhas`, 1, 100),
        overflow: e.overflow,
        tamMin: e.tamMin === undefined ? undefined : num(e.tamMin, `${onde}.estilo.tamMin`, 6, 400),
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
    };
  }
  if (c.tipo === "forma") {
    if (c.forma !== "ret" && c.forma !== "elipse") falha(`${onde}.forma inválida.`);
    const e = obj(c.estilo, `${onde}.estilo`);
    return {
      ...base,
      tipo: "forma",
      forma: c.forma,
      estilo: { cor: cor(e.cor, `${onde}.estilo.cor`), raio: e.raio === undefined ? undefined : num(e.raio, `${onde}.estilo.raio`, 0, 1000) },
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
export function validarPacote(v: unknown): PacoteProva {
  const p = obj(v, "pacote");
  if (p.v !== 1) falha("pacote: versão não suportada.");
  if (p.sintetico !== true) falha("pacote: a prova só aceita documentos sintéticos.");
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
    const dados = str(x.dados, `recurso ${k}.dados`, 4_000_000);
    if (!/^[A-Za-z0-9+/=]+$/.test(dados)) falha(`recurso ${k}: dados inválidos.`);
    assets[k] = { id: k, mime: x.mime, largura: num(x.largura, `recurso ${k}.largura`, 1, 8000), altura: num(x.altura, `recurso ${k}.altura`, 1, 8000), dados };
  }
  const vo = obj(p.variantes, "variantes");
  return {
    v: 1,
    id: str(p.id, "pacote.id", 80),
    nome: str(p.nome, "pacote.nome", 120),
    sintetico: true,
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
  getAdvanceWidth(texto: string, tamanho: number, opcoes?: { kerning?: boolean }): number;
  getPath(texto: string, x: number, y: number, tamanho: number, opcoes?: { kerning?: boolean }): { toPathData(decimais?: number): string };
}

export interface Medidor {
  largura(texto: string, tam: number, peso: Peso): number;
  ascendente(peso: Peso): number;
  descendente(peso: Peso): number;
  /** Glyph outlines as SVG path data: identical geometry for canvas and SVG output. */
  caminho(texto: string, x: number, baseline: number, tam: number, peso: Peso): string;
}

export function criarMedidor(fontes: Record<Peso, FonteOT>): Medidor {
  return {
    largura: (t, tam, peso) => fontes[peso].getAdvanceWidth(t, tam, { kerning: true }),
    ascendente: (peso) => fontes[peso].ascender / fontes[peso].unitsPerEm,
    descendente: (peso) => Math.abs(fontes[peso].descender) / fontes[peso].unitsPerEm,
    caminho: (t, x, y, tam, peso) => fontes[peso].getPath(t, x, y, tam, { kerning: true }).toPathData(2),
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
}

function quebrar(texto: string, tam: number, peso: Peso, max: number, m: Medidor): string[] {
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
      if (m.largura(tentativa, tam, peso) <= max) {
        atual = tentativa;
        continue;
      }
      if (atual) out.push(atual);
      // Hard-break a single word longer than the box.
      let resto = palavra;
      while (m.largura(resto, tam, peso) > max && resto.length > 1) {
        let n = resto.length - 1;
        while (n > 1 && m.largura(resto.slice(0, n), tam, peso) > max) n--;
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
    linhas = quebrar(texto, tam, e.peso, w, m);
    cabem = Math.max(1, Math.min(e.maxLinhas ?? Infinity, Math.floor((h + 0.001) / lh)));
    if (linhas.length <= cabem || e.overflow !== "reduzir" || tam <= tamMin) break;
    tam = Math.max(tamMin, tam - 2);
  }
  let cortado = false;
  if (linhas.length > cabem) {
    cortado = true;
    linhas = linhas.slice(0, cabem);
    let ultima = linhas[cabem - 1];
    while (ultima.length > 0 && m.largura(`${ultima}…`, tam, e.peso) > w) ultima = ultima.slice(0, -1).trimEnd();
    linhas[cabem - 1] = `${ultima}…`;
  }
  const lh = tam * e.linha;
  const asc = m.ascendente(e.peso) * tam;
  const desc = m.descendente(e.peso) * tam;
  return {
    tam,
    alturaLinha: lh,
    cortado,
    linhas: linhas.map((t, i) => {
      const largura = m.largura(t, tam, e.peso);
      const x = e.alinh === "esq" ? 0 : e.alinh === "centro" ? (w - largura) / 2 : w - largura;
      return { texto: t, largura, x, baseline: i * lh + (lh - (asc + desc)) / 2 + asc };
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
      if (c.forma === "ret") {
        partes.push(`<rect x="${r(c.x)}" y="${r(c.y)}" width="${r(c.w)}" height="${r(c.h)}" rx="${r(c.estilo.raio ?? 0)}" fill="${c.estilo.cor}" opacity="${op}"/>`);
      } else {
        partes.push(`<ellipse cx="${r(c.x + c.w / 2)}" cy="${r(c.y + c.h / 2)}" rx="${r(c.w / 2)}" ry="${r(c.h / 2)}" fill="${c.estilo.cor}" opacity="${op}"/>`);
      }
    } else if (c.tipo === "imagem") {
      const a = pacote.assets[c.asset_id];
      const k = calcularRecorte(a, c);
      partes.push(
        `<svg x="${r(c.x + k.dx)}" y="${r(c.y + k.dy)}" width="${r(k.dw)}" height="${r(k.dh)}" viewBox="${r(k.sx)} ${r(k.sy)} ${r(k.sw)} ${r(k.sh)}" preserveAspectRatio="none" opacity="${op}">` +
          `<image width="${a.largura}" height="${a.altura}" xlink:href="data:${a.mime};base64,${a.dados}"/></svg>`,
      );
    } else {
      const lay = layoutTexto(resolverTexto(c, pacote.conteudo), c.estilo, c.w, c.h, m);
      // Text is emitted as glyph outlines from the same font file, so the server
      // does not depend on its own shaping; the editable text stays in the JSON.
      partes.push(`<g opacity="${op}" fill="${c.estilo.cor}"><title>${esc(lay.linhas.map((l) => l.texto).join(" "))}</title>`);
      for (const l of lay.linhas) {
        if (!l.texto) continue;
        partes.push(`<path d="${m.caminho(l.texto, c.x + l.x, c.y + l.baseline, lay.tam, c.estilo.peso)}"/>`);
      }
      partes.push(`</g>`);
    }
  }
  partes.push(`</svg>`);
  return partes.join("");
}
