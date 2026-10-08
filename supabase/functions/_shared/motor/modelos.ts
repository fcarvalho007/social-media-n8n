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
/**
 * `adotarLivres`: pages whose texts were typed by hand (no editorial ref) adopt the largest free text as title
 * and the next as body, so redesign can recompose them; small images (logos) stay where they are.
 */
function partes(p: Pagina, adotarLivres = false): Partes {
  const r: Partes = { imagens: [], outras: [] };
  const temRef = p.camadas.some((c) => c.tipo === "texto" && !!c.ref);
  const livres = adotarLivres && !temRef
    ? p.camadas.filter((c): c is CamadaTexto => c.tipo === "texto" && c.id !== "num" && !!c.texto?.trim()).sort((a, b) => b.estilo.tam - a.estilo.tam)
    : [];
  for (const c of p.camadas) {
    if (c.tipo === "texto" && (c.ref?.endsWith(".titulo") || c === livres[0]) && !r.titulo) r.titulo = c;
    else if (c.tipo === "texto" && (c.ref?.endsWith(".texto") || c === livres[1]) && !r.corpo) r.corpo = c;
    else if (c.tipo === "texto" && c.id === "num" && !r.num) r.num = c;
    else if (c.tipo === "imagem" && !(adotarLivres && c.w * c.h < LARGURA * 1350 * 0.25)) r.imagens.push(c);
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

interface Tipo { familia: Familia; peso: Peso; linha: number; capitular?: boolean }
function altura(c: CamadaTexto, conteudo: ConteudoEditorial, t: Tipo, tam: number, w: number, m?: Medidor): number {
  const texto = resolverTexto(c, conteudo);
  if (!texto.trim()) return Math.ceil(tam * t.linha);
  if (m) return Math.ceil(layoutTexto(texto, { peso: t.peso, familia: t.familia, tam, linha: t.linha, alinh: "esq", cor: "#000000", overflow: "cortar", capitular: t.capitular }, w, 100_000, m).linhas.length * tam * t.linha);
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

const texto = (c: CamadaTexto, x: number, y: number, w: number, h: number, t: Tipo, tam: number, cor: string, alinh: CamadaTexto["estilo"]["alinh"] = "esq", z = 20, capitular?: boolean): CamadaTexto =>
  ({ ...c, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.max(1, Math.ceil(h) + 4), z, estilo: { ...c.estilo, familia: t.familia, peso: t.peso, linha: t.linha, tam, tamMin: tam, cor, alinh, overflow: "cortar", maxLinhas: undefined, capitular: capitular || undefined } });

export interface ContextoModelo { altura?: number; unica?: boolean; indice: number; total: number; paleta: Paleta; par: string; /** Explicit typography; wins over `par`. */ tipografia?: { titulo: Familia; corpo: Familia }; conteudo: ConteudoEditorial; assets: PacoteProva["assets"]; m?: Medidor; /** Break slide: composed with the strong (cover-like) treatment. */ forte?: boolean; /** Composition of the direction (A/B) for directions that compose both themselves. */ variante?: "A" | "B" }
export interface ResultadoModelo { pagina: Pagina; cabe: boolean; /** Page shows the explicit "Imagem por escolher" placeholder. */ marcador: boolean }

/** Composes ONE page in a model. Returns null when the page has no editorial text (manual-only page). */
export function comporModelo(p: Pagina, modelo: EstiloId, ctx: ContextoModelo): ResultadoModelo | null {
  const ALTURA = ctx.altura ?? 1350;
  const LIMITE = ALTURA === 1920 ? 1570 : 1210;
  const q = partes(p);
  if (!q.titulo && !q.corpo) return null;
  const { indice, total, paleta: pal, conteudo, m } = ctx;
  const par = ctx.tipografia ?? PARES_FONTES.find((x) => x.id === ctx.par) ?? PARES_FONTES[0];
  const capa = indice === 0 || !!ctx.forte;
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
      const tT = tTit(700, 1.08), tB: Tipo = { ...tCorpo(1.45), capitular: !capa };
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
        b = q.corpo && texto(q.corpo, X, q.titulo ? yDiv + 52 : y0, W, s.hB, tB, s.tamB, legivel(capa ? tinta : pal.texto, fundo, false), "esq", 20, !capa);
      }
      corNum = legivel(pal.discreto, fundo, false);
      break;
    }
    case "impacto": {
      // A: geometric panels (one strong surface, deliberate asymmetry). B: expressive typography
      // (dominant title, heavy rule, no panels). Strength from scale, never from stacked effects.
      const expressiva = ctx.variante === "B";
      const tT = tTit(expressiva ? 900 : 700, expressiva ? 0.96 : 1.02), tB = tCorpo(1.42);
      const X = 96, W = LARGURA - 2 * X;
      if (expressiva) {
        fundo = capa ? pal.fundoCapa : pal.fundo;
        const tinta = capa ? sobre(fundo) === "#ffffff" ? "#ffffff" : pal.titulo : pal.titulo;
        const y0 = capa ? 300 : 170;
        const s = escolherTamanhos(q, conteudo, tT, tB, capa ? [168, 150, 136, 120, 108] : [132, 120, 108, 96, 88, 80], [42, 40, 38, 36], W, W - 120, 120, LIMITE - y0, m) ?? falhou();
        if (s) {
          t = q.titulo && texto(q.titulo, X, y0, W, s.hT, tT, s.tamT, legivel(tinta, fundo, true));
          const yR = y0 + s.hT + 40;
          if (q.titulo) decor.push(ret("mod-regua-forte", X, yR, 200, 16, capa ? tinta : pal.destaque, 2));
          b = q.corpo && texto(q.corpo, X, Math.max(yR + 64, LIMITE - s.hB), W - 120, s.hB, tB, s.tamB, legivel(capa ? tinta : pal.texto, fundo, false));
        }
      } else if (capa) {
        fundo = pal.fundoCapa;
        const s = escolherTamanhos(q, conteudo, tT, tB, [128, 116, 104, 92, 84], [44, 40, 38, 36], W - 200, W - 240, 80, LIMITE - 360, m) ?? falhou();
        decor.push(ret("mod-painel-lateral", LARGURA - 200, 0, 200, ALTURA, pal.destaque, 1));
        if (s) {
          t = q.titulo && texto(q.titulo, X, 360, W - 200, s.hT, tT, s.tamT, "#ffffff");
          b = q.corpo && texto(q.corpo, X, 360 + s.hT + 80, W - 240, s.hB, tB, s.tamB, legivel("#e8edf2", fundo, false));
        }
      } else {
        fundo = pal.fundo;
        const wT = W - 80;
        const s = escolherTamanhos(q, conteudo, tT, tB, [92, 84, 76, 68, 60], [44, 40, 38, 36], wT, W, 150, LIMITE - 140, m) ?? falhou();
        const hP = s ? 140 + s.hT + 70 : 560;
        decor.push(ret("mod-painel", 0, 0, LARGURA, hP, pal.fundoCapa, 1));
        decor.push(ret("mod-corte", X, hP - 8, 160, 16, pal.destaque, 2));
        if (s) {
          t = q.titulo && texto(q.titulo, X, 140, wT, s.hT, tT, s.tamT, "#ffffff");
          b = q.corpo && texto(q.corpo, X, hP + 80, W, s.hB, tB, s.tamB, legivel(pal.texto, fundo, false));
        }
      }
      corNum = legivel(pal.discreto, fundo, false);
      if (capa && !expressiva) corNum = "#d5dde5";
      break;
    }
    case "contraste": {
      // Asymmetric black panel + controlled neon accent; strong contrast everywhere.
      const tT = tTit(700, 1.04), tB = tCorpo(1.4);
      const preto = pal.fundoCapa; // navy in the brand palettes (was fixed black)
      if (capa) {
        fundo = preto;
        const X = 96, W = LARGURA - 2 * X;
        const s = escolherTamanhos(q, conteudo, tT, tB, [124, 112, 100, 88], [44, 40, 38, 36], W, W - 200, esp + 40, LIMITE - 300, m) ?? falhou();
        decor.push(ret("mod-acento", X, 220, 120, 18, pal.destaque, 2));
        decor.push(ret("mod-bloco", LARGURA - 220, 1000, 220, 200, pal.destaque, 1));
        if (s) {
          t = q.titulo && texto(q.titulo, X, 300, W, s.hT, tT, s.tamT, "#ffffff");
          b = q.corpo && texto(q.corpo, X, 300 + s.hT + esp + 40, W - 200, s.hB, tB, s.tamB, "#d9d9d4");
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
      const tT = tTit(900, 0.98), tB = tCorpo(1.4);
      const X = 80, W = LARGURA - 2 * X;
      const img = imagens.find((i) => i.id !== "mod-foto");
      let y0 = capa ? 430 : 380;
      if (img && !capa) {
        imagens = imagens.map((i) => (i === img ? { ...i, x: 0, y: 0, w: LARGURA, h: 520, recorte: "cover" as const, z: 1, mascara: "diagonal" as const } : i));
        y0 = 600;
      } else if (capa) {
        decor.push(elipse("mod-circulo", LARGURA - 520, -300, 860, 860, pal.fundo, 1, 0.16));
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
        const foto: CamadaImagem = { ...(propria ?? { id: "mod-foto", tipo: "imagem" as const, asset_id: assetId }), x: 0, y: 0, w: LARGURA, h: ALTURA, z: 0, recorte: "cover", mascara: undefined } as CamadaImagem;
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
      if (ctx.variante === "B" && !capa) {
        // "Cartões": one real card per separable unit of the body. Not separable -> refused (page kept as it was).
        const corpoTxt = q.corpo ? resolverTexto(q.corpo, conteudo) : "";
        const unid = unidadesSeparaveis(corpoTxt);
        if (!unid || !q.corpo) { falhou(); break; }
        const tT = tTit(700, 1.1), tB = tCorpo(1.4);
        const X = 96, W = LARGURA - 2 * X, PAD = 28, NUM = 64, wTxt = W - 2 * PAD - NUM - 20;
        fundo = pal.fundo;
        const prog = (indice + 1) / Math.max(1, total);
        decor.push(ret("mod-progresso-base", X, 96, W, 12, pal.titulo, 2, 6, 0.18));
        decor.push(ret("mod-progresso", X, 96, Math.max(24, W * prog), 12, pal.destaque, 3, 6));
        const y0 = 170;
        const linhas = corpoTxt.split("\n");
        let tamB = 40;
        const prefixo = (k: number) => (k <= 0 ? 0 : altura({ ...q.corpo, ref: undefined, texto: linhas.slice(0, k).join("\n") }, conteudo, tB, tamB, wTxt, m));
        let sT: ReturnType<typeof escolherTamanhos> = null;
        for (const tb of [40, 38, 36]) {
          tamB = tb;
          const hB = altura(q.corpo, conteudo, tB, tb, wTxt, m) + 2 * PAD;
          sT = q.titulo ? escolherTamanhos({ ...q, corpo: undefined }, conteudo, tT, tB, [76, 68, 60, 56], [tb], W, W, 0, LIMITE - y0 - hB - 56, m) : { tamT: 0, tamB: tb, hT: 0, hB: 0 };
          if (sT) break;
        }
        if (!sT) { falhou(); break; }
        if (q.titulo) t = texto(q.titulo, X, y0, W, sT.hT, tT, sT.tamT, legivel(pal.titulo, fundo, true));
        // Cards are drawn around each unit's own lines; the single body layer keeps its ref (text stays editable).
        const yCorpo = y0 + sT.hT + (q.titulo ? 56 : 0) + PAD;
        const hTot = altura(q.corpo, conteudo, tB, tamB, wTxt, m);
        const pos = unid.map((u) => ({ ini: prefixo(u.de), fim: prefixo(u.ate) }));
        const claro = sobre(pal.fundo) === "#ffffff";
        pos.forEach((u, k) => {
          const ant = pos[k - 1], seg = pos[k + 1];
          const topo = k === 0 ? u.ini - PAD : (ant.fim + u.ini) / 2 + 5;
          const base = !seg ? u.fim + PAD : (u.fim + seg.ini) / 2 - 5;
          const yc = yCorpo + topo;
          decor.push(ret(`mod-cartao-${k}`, X, yc, W, base - topo, claro ? "#ffffff" : pal.destaque, 2, 18, claro ? 0.12 : 0.1));
          decor.push(elipse(`mod-cartao-num-${k}`, X + PAD, yCorpo + u.ini - 4, NUM - 8, NUM - 8, pal.destaque, 3));
          decor.push({ id: `mod-cartao-n-${k}`, tipo: "texto", texto: String(k + 1), x: X + PAD, y: yCorpo + u.ini + 10, w: NUM - 8, h: 36, z: 4,
            estilo: { peso: 700, familia: par.titulo, tam: 28, linha: 1, alinh: "centro", cor: sobre(pal.destaque), overflow: "cortar" } });
        });
        if (yCorpo + hTot + PAD > LIMITE) { falhou(); break; }
        b = texto(q.corpo, X + PAD + NUM + 20, yCorpo, wTxt, hTot, tB, tamB, legivel(pal.texto, fundo, false));
        corNum = legivel(pal.discreto, fundo, false);
        break;
      }
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
  if (ALTURA === 1920) {
    // Story reading zones: top 250 px and bottom 340 px stay free for the network's own interface.
    const textos = [t, b].filter((c): c is CamadaTexto => !!c);
    const mover = (c: Camada) => c.h < ALTURA * 0.6 && c.w < LARGURA;
    const topo = Math.min(...textos.map((c) => c.y));
    const fundoTxt = Math.max(...textos.map((c) => c.y + c.h));
    const lim = ALTURA - ZONA_STORY.base;
    // Move down out of the top zone, or up out of the bottom zone; refuse only when the text is taller than the band.
    const d = topo < ZONA_STORY.topo ? ZONA_STORY.topo - topo : fundoTxt > lim ? lim - fundoTxt : 0;
    if (topo + d < ZONA_STORY.topo || fundoTxt + d > lim) return { pagina: p, cabe: false, marcador: false };
    if (d) {
      if (t) t = { ...t, y: t.y + d };
      if (b) b = { ...b, y: b.y + d };
      for (let i = 0; i < decor.length; i++) if (mover(decor[i])) decor[i] = { ...decor[i], y: decor[i].y + d };
    }
  }
  const num = !ctx.unica && q.num ? { ...q.num, x: q.num.x, y: 1250, z: 20, estilo: { ...q.num.estilo, cor: corNum, familia: par.corpo } } : undefined;
  const camadas: Camada[] = [...imagens, ...decor, ...q.outras, ...[t, b, num].filter((c): c is CamadaTexto => !!c)];
  return { pagina: { ...p, fundo, camadas }, cabe: true, marcador };
}

/** Story safe areas (px at 1080×1920). */
export const ZONA_STORY = { topo: 250, base: 340 } as const;

/**
 * Separable units of a body text (lines or paragraphs): 2–5 units, each short enough to be a card.
 * Returns line ranges [de, ate) in the original "\n"-split text, or null when the text is one continuous block.
 */
export function unidadesSeparaveis(txt: string): Array<{ de: number; ate: number }> | null {
  const linhas = txt.split("\n");
  const out: Array<{ de: number; ate: number }> = [];
  let de = -1;
  linhas.forEach((l, i) => {
    if (l.trim()) { if (de < 0) de = i; }
    else if (de >= 0) { out.push({ de, ate: i }); de = -1; }
  });
  if (de >= 0) out.push({ de, ate: linhas.length });
  // A single paragraph with list markers on separate lines counts per line.
  const unid = out.length >= 2 ? out : linhas.map((l, i) => ({ l, i })).filter((x) => x.l.trim()).map((x) => ({ de: x.i, ate: x.i + 1 }));
  if (unid.length < 2 || unid.length > 5) return null;
  if (unid.some((u) => linhas.slice(u.de, u.ate).join(" ").length > 220)) return null;
  return unid;
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
      const r = comporModelo(pg, modelo, { indice: i, total: doc.paginas.length, paleta, par, conteudo: pacote.conteudo, assets: pacote.assets, m, altura: doc.altura, unica: (doc.formato ?? "carrossel") !== "carrossel" });
      if (!r) return pg;
      if (!r.cabe) { recusadas.push({ variante: v, pagina: i }); return pg; }
      marcador ||= r.marcador;
      return r.pagina;
    }) };
    variantesOut[v] = out;
  }
  return { pacote: { ...pacote, variantes: variantesOut }, recusadas, marcador };
}

// ---------- pre-flight checks shared by editor, review and server ----------

export const ID_MARCADOR = "mod-ph-rotulo";
/** True when a page still shows the "Imagem por escolher" placeholder. */
export const paginaComMarcador = (p: Pagina) => p.camadas.some((c) => c.id === ID_MARCADOR);
export const paginasComMarcador = (d: DocumentoGrafico) => d.paginas.flatMap((p, i) => (paginaComMarcador(p) ? [i + 1] : []));

/** Adds a clear "test draft" watermark (manual-style text layer) to every page with the placeholder. Test downloads only. */
export function comMarcaRascunho(d: DocumentoGrafico): DocumentoGrafico {
  return { ...d, paginas: d.paginas.map((p) => (paginaComMarcador(p) ? { ...p, camadas: [...p.camadas,
    { id: "rascunho-faixa", tipo: "forma", forma: "ret", x: 0, y: 600, w: LARGURA, h: 150, z: 900, opacidade: 0.82, estilo: { cor: "#b42318" } } as CamadaForma,
    { id: "rascunho-texto", tipo: "texto", texto: "RASCUNHO DE TESTE — IMAGEM POR ESCOLHER", x: 40, y: 625, w: LARGURA - 80, h: 104, z: 901, estilo: { peso: 900, familia: "montserrat", tam: 40, linha: 1.25, alinh: "centro", cor: "#ffffff", overflow: "cortar" } } as CamadaTexto,
  ] } : p)) };
}

export interface NotaIlegivel { pagina: number; id: string; nome: string; razao: number; minimo: number; sugerida: string }
const minimo = (e: { tam: number; peso: number }) => (e.tam >= 72 || (e.tam >= 56 && e.peso >= 700) ? 3 : 4.5);
const dentro = (c: Camada, x: number, y: number) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;

/** Manual text layers (no editorial ref, not engine decoration/page number) whose colour is not legible on what is really under them. */
export function notasIlegiveis(d: DocumentoGrafico): NotaIlegivel[] {
  const out: NotaIlegivel[] = [];
  d.paginas.forEach((p, i) => {
    for (const c of p.camadas) {
      if (c.tipo !== "texto" || c.ref || c.id === "num" || ehDecoracao(c) || c.id.startsWith("rascunho-")) continue;
      const cx = c.x + c.w / 2, cy = c.y + Math.min(c.h, c.estilo.tam * c.estilo.linha) / 2;
      const baixo = p.camadas.filter((o) => o !== c && o.z <= c.z && o.tipo !== "texto" && dentro(o, cx, cy)).sort((a, b) => b.z - a.z);
      const topo = baixo[0];
      // Lower part of a reading gradient is effectively its colour; elsewhere over a photo it needs a visual check.
      const sobreGradiente = topo?.tipo === "forma" && topo.forma === "gradiente";
      if (topo?.tipo === "imagem" || (sobreGradiente && (cy < topo.y + topo.h * 0.6 || (topo.opacidade ?? 1) < 0.85))) continue;
      const fill = topo?.tipo === "forma" && topo.forma !== "icone" && (sobreGradiente || (topo.opacidade ?? 1) >= 0.9) ? topo.estilo.cor : p.fundo;
      const r = contraste(c.estilo.cor, fill), min = minimo(c.estilo);
      if (r < min) out.push({ pagina: i, id: c.id, nome: c.nome ?? "nota", razao: r, minimo: min, sugerida: sobre(fill) });
    }
  });
  return out;
}

/** Recolours ONLY the listed manual layers to the suggested legible colour; nothing else changes. */
export function adaptarCorNotas(d: DocumentoGrafico, notas: NotaIlegivel[]): DocumentoGrafico {
  return { ...d, paginas: d.paginas.map((p, i) => {
    const desta = notas.filter((n) => n.pagina === i);
    if (!desta.length) return p;
    return { ...p, camadas: p.camadas.map((c) => {
      const n = desta.find((x) => x.id === c.id);
      return n && c.tipo === "texto" ? { ...c, estilo: { ...c.estilo, cor: n.sugerida } } : c;
    }) };
  }) };
}
