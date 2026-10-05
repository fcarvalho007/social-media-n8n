// Six carousel models that change the page COMPOSITION (positions, grid, shapes, image use, hierarchy),
// not only colours. Pure: browser preview, tests and the server share it.
// Invariants: text layers keep id/ref (text is never touched), engine decorations are rebuilt with ids
// prefixed "mod-", manual layers are kept, sizes come from each model's own ladder (never below a readable
// floor) and a page that does not fit at the floor is REFUSED (left as it was) — nothing is cut or hidden.
import {
  ALTURA, LARGURA, layoutTexto, resolverTexto,
  type Camada, type CamadaForma, type CamadaImagem, type CamadaTexto, type ConteudoEditorial, type DocumentoGrafico, type Familia,
  type IconeId, type Medidor, type PacoteProva, type Pagina, type Peso, type Variante, PARES_FONTES,
} from "../documento-grafico/nucleo.ts";
import { contraste } from "./composicoes.ts";
import type { EstiloId, Paleta } from "./estilos.ts";

/** Engine decoration ids (old compositions + models). Everything else that is not text/image is manual. */
export const ehDecoracao = (c: Camada) => c.id === "faixa" || c.id === "regua" || c.id === "bloco" || c.id.startsWith("mod-");

const LIMITE = 1210; // page number band starts at 1250
const ICONES_CICLO: IconeId[] = ["alvo", "lampada", "grafico", "check", "estrela", "info", "seta"];

interface Partes { titulo?: CamadaTexto; corpo?: CamadaTexto; num?: CamadaTexto; imagens: CamadaImagem[]; outras: Camada[] }
function partes(p: Pagina): Partes {
  const r: Partes = { imagens: [], outras: [] };
  for (const c of p.camadas) {
    if (c.tipo === "texto" && c.ref?.endsWith(".titulo") && !r.titulo) r.titulo = c;
    else if (c.tipo === "texto" && c.ref?.endsWith(".texto") && !r.corpo) r.corpo = c;
    else if (c.tipo === "texto" && c.id === "num" && !r.num) r.num = c;
    else if (c.tipo === "imagem") r.imagens.push(c);
    else if (ehDecoracao(c)) continue;
    else r.outras.push(c);
  }
  return r;
}

const ret = (id: string, x: number, y: number, w: number, h: number, cor: string, z = 1, raio = 0, opacidade?: number): CamadaForma =>
  ({ id, tipo: "forma", forma: "ret", x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), z, opacidade, estilo: { cor, raio } });
const elipse = (id: string, x: number, y: number, w: number, h: number, cor: string, z = 1, opacidade?: number): CamadaForma =>
  ({ id, tipo: "forma", forma: "elipse", x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z, opacidade, estilo: { cor } });
const sobre = (fill: string) => (contraste("#111111", fill) >= contraste("#ffffff", fill) ? "#111111" : "#ffffff");
/** Keeps `cor` when legible on `fill` (4.5:1 body / 3:1 large), else ink or white. */
const legivel = (cor: string, fill: string, grande: boolean) => (contraste(cor, fill) >= (grande ? 3 : 4.5) ? cor : sobre(fill));

interface Tipo { familia: Familia; peso: Peso; linha: number }
function altura(c: CamadaTexto, conteudo: ConteudoEditorial, t: Tipo, tam: number, w: number, m?: Medidor): number {
  const texto = resolverTexto(c, conteudo);
  if (!texto.trim()) return Math.ceil(tam * t.linha);
  if (m) return Math.ceil(layoutTexto(texto, { peso: t.peso, familia: t.familia, tam, linha: t.linha, alinh: "esq", cor: "#000000", overflow: "cortar" }, w, 100_000, m).linhas.length * tam * t.linha);
  const porLinha = Math.max(1, Math.floor(w / (tam * 0.56)));
  return Math.ceil(texto.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / porLinha)), 0) * tam * t.linha);
}

/** Picks the largest (title, body) sizes from the ladders whose total height fits `disponivel`. */
function escolherTamanhos(q: Partes, conteudo: ConteudoEditorial, tT: Tipo, tB: Tipo, escT: number[], escB: number[], wT: number, wB: number, espaco: number, disponivel: number, m?: Medidor) {
  for (let k = 0; k < escT.length + escB.length - 1; k++) {
    for (let i = 0; i <= k; i++) {
      const j = k - i;
      if (i >= escT.length || j >= escB.length) continue;
      const hT = q.titulo ? altura(q.titulo, conteudo, tT, escT[i], wT, m) : 0;
      const hB = q.corpo ? altura(q.corpo, conteudo, tB, escB[j], wB, m) : 0;
      if (hT + (q.titulo && q.corpo ? espaco : 0) + hB <= disponivel) return { tamT: escT[i], tamB: escB[j], hT, hB };
    }
  }
  return null;
}

const texto = (c: CamadaTexto, x: number, y: number, w: number, h: number, t: Tipo, tam: number, cor: string, alinh: CamadaTexto["estilo"]["alinh"] = "esq", z = 20): CamadaTexto =>
  ({ ...c, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.max(1, Math.ceil(h) + 4), z, estilo: { ...c.estilo, familia: t.familia, peso: t.peso, linha: t.linha, tam, tamMin: tam, cor, alinh, overflow: "cortar", maxLinhas: undefined } });

export interface ContextoModelo { indice: number; total: number; paleta: Paleta; par: string; conteudo: ConteudoEditorial; assets: PacoteProva["assets"]; m?: Medidor }
export interface ResultadoModelo { pagina: Pagina; cabe: boolean; /** Page shows the explicit "Imagem por escolher" placeholder. */ marcador: boolean }

/** Composes ONE page in a model. Returns null when the page has no editorial text (manual-only page). */
export function comporModelo(p: Pagina, modelo: EstiloId, ctx: ContextoModelo): ResultadoModelo | null {
  const q = partes(p);
  if (!q.titulo && !q.corpo) return null;
  const { indice, total, paleta: pal, conteudo, m } = ctx;
  const par = PARES_FONTES.find((x) => x.id === ctx.par) ?? PARES_FONTES[0];
  const capa = indice === 0;
  const decor: Camada[] = [];
  let fundo = capa ? pal.fundoCapa : pal.fundo;
  let imagens = q.imagens;
  let marcador = false;
  let t: CamadaTexto | undefined, b: CamadaTexto | undefined;
  let cabe = true;
  let corNum = pal.discreto;
  const tTit = (peso: Peso, linha: number, familia: Familia = par.titulo): Tipo => ({ familia, peso, linha });
  const tCorpo = (linha: number, familia: Familia = par.corpo): Tipo => ({ familia, peso: 400, linha });
  const esp = 40;
  const falhou = () => { cabe = false; return null; };

  switch (modelo) {
    case "editorial": {
      // Rigorous editorial grid: hairlines, generous single column (never narrow), serif title.
      const X = 110, W = LARGURA - 2 * X;
      const tT = tTit(700, 1.08), tB = tCorpo(1.45);
      const y0 = capa ? 330 : 210;
      const s = escolherTamanhos(q, conteudo, tT, tB, capa ? [112, 100, 88, 76] : [88, 80, 72, 64, 58], [44, 40, 38, 36], W, W, 96, LIMITE - y0, m) ?? falhou();
      fundo = capa ? pal.fundoCapa : pal.fundo;
      const tinta = sobre(fundo) === "#ffffff" ? "#ffffff" : pal.titulo;
      decor.push(ret("mod-linha-topo", X, y0 - 70, W, 2, tinta, 2));
      decor.push(ret("mod-marca", X, y0 - 92, 56, 8, capa ? tinta : pal.destaque, 2));
      decor.push(ret("mod-linha-base", X, 1228, W, 1, tinta, 2, 0, 0.5));
      if (s) {
        t = q.titulo && texto(q.titulo, X, y0, W, s.hT, tT, s.tamT, legivel(capa ? tinta : pal.titulo, fundo, true));
        const yDiv = y0 + s.hT + 44;
        if (q.titulo && q.corpo) decor.push(ret("mod-divisor", X, yDiv, 120, 3, capa ? tinta : pal.destaque, 2));
        b = q.corpo && texto(q.corpo, X, q.titulo ? yDiv + 52 : y0, W, s.hB, tB, s.tamB, legivel(capa ? tinta : pal.texto, fundo, false));
      }
      corNum = legivel(pal.discreto, fundo, false);
      break;
    }
    case "contraste": {
      // Asymmetric black panel + controlled neon accent; strong contrast everywhere.
      const tT = tTit(700, 1.04), tB = tCorpo(1.4);
      const preto = "#0d0d0d";
      if (capa) {
        fundo = preto;
        const X = 96, W = LARGURA - 2 * X;
        const s = escolherTamanhos(q, conteudo, tT, tB, [124, 112, 100, 88], [44, 40, 38, 36], W, W, esp + 40, LIMITE - 300, m) ?? falhou();
        decor.push(ret("mod-acento", X, 220, 120, 18, pal.destaque, 2));
        decor.push(ret("mod-bloco", LARGURA - 260, ALTURA - 220, 260, 220, pal.destaque, 1));
        if (s) {
          t = q.titulo && texto(q.titulo, X, 300, W, s.hT, tT, s.tamT, "#ffffff");
          b = q.corpo && texto(q.corpo, X, 300 + s.hT + esp + 40, W - 200, s.hB, tB, s.tamB, "#d9d9d4");
          if (b && 300 + s.hT + esp + 40 + s.hB > ALTURA - 240) b = { ...b, w: W };
        }
        corNum = "#bdbdb6";
      } else {
        fundo = pal.fundo;
        const X = 96, wPainel = LARGURA - 180, wT = wPainel - 2 * X;
        const s = escolherTamanhos(q, conteudo, tT, tB, [92, 84, 76, 68, 60], [44, 40, 38, 36], wT, LARGURA - 2 * X, 72 + 96, LIMITE - 170, m) ?? falhou();
        const hP = s ? 170 + s.hT + 80 : 600;
        decor.push(ret("mod-painel", 0, 0, wPainel, hP, preto, 1));
        decor.push(ret("mod-acento", X, 112, 96, 14, pal.destaque, 2));
        decor.push(ret("mod-bloco", wPainel, hP - 150, 180, 150, pal.destaque, 1));
        if (s) {
          t = q.titulo && texto(q.titulo, X, 170, wT, s.hT, tT, s.tamT, "#ffffff");
          b = q.corpo && texto(q.corpo, X, hP + 72, LARGURA - 2 * X, s.hB, tB, s.tamB, legivel(pal.texto, fundo, false));
        }
        corNum = legivel(pal.discreto, fundo, false);
      }
      break;
    }
    case "revista": {
      // Black title, dramatic scale; a decorative circle may bleed off the page, text never does.
      const tT = tTit(900, 0.98, "montserrat"), tB = tCorpo(1.4);
      const X = 80, W = LARGURA - 2 * X;
      const img = imagens.find((i) => i.id !== "mod-foto");
      let y0 = capa ? 430 : 380;
      if (img && !capa) {
        imagens = imagens.map((i) => (i === img ? { ...i, x: 0, y: 0, w: LARGURA, h: 520, recorte: "cover" as const, z: 1 } : i));
        decor.push(elipse("mod-circulo", LARGURA - 300, 380, 360, 360, pal.destaque, 2));
        y0 = 600;
      } else {
        decor.push(elipse("mod-circulo", LARGURA - 520, -300, 860, 860, capa ? pal.fundo : pal.destaque, 1, capa ? 0.16 : 1));
      }
      const s = escolherTamanhos(q, conteudo, tT, tB, capa ? [156, 140, 124, 108, 96] : [120, 108, 96, 84, 76, 68], [42, 40, 38, 36], W, W, 64, LIMITE - y0, m) ?? falhou();
      const tinta = capa ? sobre(fundo) : pal.titulo;
      decor.push(ret("mod-barra", X, y0 - 44, 180, 18, tinta, 3));
      if (s) {
        // Title may cross the circle: keep it legible against whichever is worse (circle or page).
        const corT = capa ? tinta : contraste(pal.titulo, pal.destaque) >= 3 && contraste(pal.titulo, fundo) >= 3 ? pal.titulo : sobre(fundo);
        t = q.titulo && texto(q.titulo, X, y0, W, s.hT, tT, s.tamT, corT);
        b = q.corpo && texto(q.corpo, X, y0 + s.hT + 64, W, s.hB, tB, s.tamB, legivel(capa ? tinta : pal.texto, fundo, false));
      }
      corNum = legivel(pal.discreto, fundo, false);
      break;
    }
    case "fotografico": {
      // Full-bleed image with a reading gradient; never generates images — reuses an existing asset or
      // shows an explicitly labelled placeholder.
      const tT = tTit(700, 1.06), tB = tCorpo(1.4);
      const X = 88, W = LARGURA - 2 * X;
      const propria = imagens[0];
      const assetId = propria?.asset_id ?? Object.keys(ctx.assets)[0];
      const resto = propria ? imagens.slice(1) : imagens;
      fundo = "#1c2621";
      if (assetId) {
        const foto: CamadaImagem = { ...(propria ?? { id: "mod-foto", tipo: "imagem" as const, asset_id: assetId }), x: 0, y: 0, w: LARGURA, h: ALTURA, z: 0, recorte: "cover" } as CamadaImagem;
        imagens = [foto, ...resto];
      } else {
        marcador = true;
        decor.push(elipse("mod-ph-a", -260, -160, 980, 980, "#2b3a33", 0));
        decor.push(elipse("mod-ph-b", 420, 140, 820, 820, "#33473e", 0));
        decor.push(ret("mod-ph-moldura", 72, 72, 420, 72, "#ffffff", 3, 36, 0.14));
        decor.push({ id: "mod-ph-rotulo", nome: "Marcador: imagem por escolher", tipo: "texto", texto: "Imagem por escolher", x: 104, y: 90, w: 380, h: 40, z: 4, estilo: { peso: 700, familia: "inter", tam: 30, linha: 1.2, alinh: "esq", cor: "#ffffff", overflow: "cortar" } });
      }
      const s = escolherTamanhos(q, conteudo, tT, tB, capa ? [112, 100, 88, 76] : [88, 80, 72, 64], [42, 40, 38, 36], W, W, esp, 760, m) ?? falhou();
      if (s) {
        const hBloco = s.hT + (q.titulo && q.corpo ? esp : 0) + s.hB;
        const y0 = LIMITE - hBloco;
        decor.push(ret("mod-veu", 0, 0, LARGURA, ALTURA, "#000000", 5, 0, 0.18));
        decor.push({ ...ret("mod-gradiente", 0, Math.max(0, y0 - 420), LARGURA, ALTURA - Math.max(0, y0 - 420), "#000000", 6, 0, 0.9), forma: "gradiente" });
        decor.push(ret("mod-acento", X, y0 - 52, 96, 12, pal.destaque, 7));
        t = q.titulo && texto(q.titulo, X, y0, W, s.hT, tT, s.tamT, "#ffffff");
        b = q.corpo && texto(q.corpo, X, y0 + s.hT + (q.titulo ? esp : 0), W, s.hB, tB, s.tamB, "#f1f1ee");
      }
      corNum = "#e6e6e1";
      break;
    }
    case "minimalista": {
      // Light page, lots of air, a single accent; density adapts (ladder) but content is never cut.
      const tT = tTit(700, 1.12), tB = tCorpo(1.55);
      const X = 144, W = LARGURA - 2 * X;
      fundo = capa ? pal.fundoCapa : pal.fundo;
      const s = escolherTamanhos(q, conteudo, tT, tB, capa ? [104, 92, 80, 72] : [80, 72, 64, 58, 54], [40, 38, 36], W, W, 56, LIMITE - 260, m) ?? falhou();
      if (s) {
        const tot = s.hT + (q.titulo && q.corpo ? 56 : 0) + s.hB;
        const y0 = Math.max(260, Math.round((ALTURA - tot) / 2) - 30);
        decor.push(elipse("mod-ponto", X, y0 - 92, 28, 28, pal.destaque, 2));
        t = q.titulo && texto(q.titulo, X, y0, W, s.hT, tT, s.tamT, legivel(pal.titulo, fundo, true));
        b = q.corpo && texto(q.corpo, X, y0 + s.hT + (q.titulo ? 56 : 0), W, s.hB, tB, s.tamB, legivel(pal.texto, fundo, false));
      }
      corNum = legivel(pal.discreto, fundo, false);
      break;
    }
    case "didatico": {
      // Prominent step number, vector icon by position, progress bar.
      const tT = tTit(700, 1.1), tB = tCorpo(1.45);
      const X = 96, W = LARGURA - 2 * X;
      fundo = capa ? pal.fundoCapa : pal.fundo;
      const tinta = capa ? sobre(fundo) : pal.titulo;
      const prog = (indice + 1) / Math.max(1, total);
      decor.push(ret("mod-progresso-base", X, 96, W, 12, tinta, 2, 6, 0.18));
      decor.push(ret("mod-progresso", X, 96, Math.max(24, W * prog), 12, capa ? tinta : pal.destaque, 3, 6));
      const icone = ICONES_CICLO[indice % ICONES_CICLO.length];
      const cIc = capa ? tinta : pal.destaque;
      decor.push(elipse("mod-icone-fundo", LARGURA - X - 152, 168, 152, 152, cIc, 2));
      decor.push({ id: "mod-icone", tipo: "forma", forma: "icone", x: LARGURA - X - 152 + 38, y: 206, w: 76, h: 76, z: 3, estilo: { cor: sobre(cIc), icone } });
      if (!capa) decor.push({ id: "mod-numero", nome: "Número do passo", tipo: "texto", texto: String(indice + 1).padStart(2, "0"), x: X, y: 150, w: 420, h: 220, z: 4,
        estilo: { peso: 900, familia: "montserrat", tam: 200, linha: 1, alinh: "esq", cor: legivel(pal.destaque, fundo, true), overflow: "cortar" } });
      const y0 = capa ? 420 : 420;
      const s = escolherTamanhos(q, conteudo, tT, tB, capa ? [108, 96, 84, 76] : [80, 72, 64, 58], [42, 40, 38, 36], W, W, esp, LIMITE - y0, m) ?? falhou();
      if (s) {
        t = q.titulo && texto(q.titulo, X, y0, W, s.hT, tT, s.tamT, legivel(tinta, fundo, true));
        b = q.corpo && texto(q.corpo, X, y0 + s.hT + (q.titulo ? esp : 0), W, s.hB, tB, s.tamB, legivel(capa ? tinta : pal.texto, fundo, false));
      }
      corNum = legivel(pal.discreto, fundo, false);
      break;
    }
  }
  if (!cabe) return { pagina: p, cabe: false, marcador: false };
  const num = q.num ? { ...q.num, x: q.num.x, y: 1250, z: 20, estilo: { ...q.num.estilo, cor: corNum, familia: par.corpo } } : undefined;
  const camadas: Camada[] = [...imagens, ...decor, ...q.outras, ...[t, b, num].filter((c): c is CamadaTexto => !!c)];
  return { pagina: { ...p, fundo, camadas }, cabe: true, marcador };
}

export interface ResultadoPacoteModelo { pacote: PacoteProva; recusadas: Array<{ variante: Variante; pagina: number }>; marcador: boolean }

/**
 * Applies a model to the chosen variants; `paginas` limits it to those page indices (slide scope).
 * Refused pages keep their current composition and are reported.
 */
export function aplicarModelo(pacote: PacoteProva, modelo: EstiloId, paleta: Paleta, par: string, variantes: Variante[], m?: Medidor, paginas?: number[]): ResultadoPacoteModelo {
  const recusadas: ResultadoPacoteModelo["recusadas"] = [];
  let marcador = false;
  const variantesOut = { ...pacote.variantes };
  for (const v of variantes) {
    const doc = pacote.variantes[v];
    const out: DocumentoGrafico = { ...doc, paginas: doc.paginas.map((pg, i) => {
      if (paginas && !paginas.includes(i)) return pg;
      const r = comporModelo(pg, modelo, { indice: i, total: doc.paginas.length, paleta, par, conteudo: pacote.conteudo, assets: pacote.assets, m });
      if (!r) return pg;
      if (!r.cabe) { recusadas.push({ variante: v, pagina: i }); return pg; }
      marcador ||= r.marcador;
      return r.pagina;
    }) };
    variantesOut[v] = out;
  }
  return { pacote: { ...pacote, variantes: variantesOut }, recusadas, marcador };
}
