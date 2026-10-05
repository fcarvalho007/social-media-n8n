import type { Asset, Camada, CamadaTexto, PacoteProva, Pagina, SlideEditorial, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

export interface EstadoEditor {
  pacote: PacoteProva;
  variante: Variante;
  pagina: number;
  selecao: string | null;
  passado: PacoteProva[];
  futuro: PacoteProva[];
}

export type Acao =
  | { tipo: "carregar"; pacote: PacoteProva }
  | { tipo: "variante"; variante: Variante }
  | { tipo: "pagina"; indice: number }
  | { tipo: "selecionar"; id: string | null }
  | { tipo: "camada"; id: string; patch: Partial<Camada>; agrupar?: string }
  | { tipo: "texto"; slide: string; campo: "titulo" | "texto"; valor: string; agrupar?: string }
  | { tipo: "ordem"; id: string; direcao: "frente" | "tras" | "topo" | "fundo" }
  | { tipo: "duplicarCamada"; id: string }
  | { tipo: "apagarCamada"; id: string }
  | { tipo: "adicionar"; camada: "texto" | "ret" | "elipse" | "linha"; preset?: PresetTexto; pos?: Ponto }
  | { tipo: "adicionarImagem"; asset: Asset; nome: string; pos?: Ponto }
  /** Whole-document change (styles, "apply to all") recorded as one undo step. */
  | { tipo: "substituir"; pacote: PacoteProva }
  | { tipo: "fundo"; cor: string }
  | { tipo: "duplicarPagina"; indice: number }
  | { tipo: "moverPagina"; de: number; para: number }
  | { tipo: "apagarPagina"; indice: number }
  | { tipo: "desfazer" }
  | { tipo: "refazer" };

export type PresetTexto = "titulo" | "subtitulo" | "paragrafo" | "livre";
export interface Ponto { x: number; y: number }

/** Text presets for inserted layers. New layers clip instead of shrinking: the font is never reduced automatically. */
export const PRESETS_TEXTO: Record<PresetTexto, { nome: string; texto: string; w: number; h: number; estilo: CamadaTexto["estilo"] }> = {
  titulo: { nome: "Título", texto: "Título", w: 900, h: 240, estilo: { peso: 700, familia: "montserrat", tam: 88, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
  subtitulo: { nome: "Subtítulo", texto: "Subtítulo", w: 900, h: 160, estilo: { peso: 700, familia: "montserrat", tam: 56, linha: 1.15, alinh: "esq", cor: "#111111", overflow: "cortar" } },
  paragrafo: { nome: "Parágrafo", texto: "Escreve aqui o parágrafo.", w: 900, h: 300, estilo: { peso: 400, familia: "inter", tam: 40, linha: 1.35, alinh: "esq", cor: "#222222", overflow: "cortar" } },
  livre: { nome: "Texto livre", texto: "Novo texto", w: 800, h: 200, estilo: { peso: 700, tam: 64, linha: 1.15, alinh: "esq", cor: "#111111", overflow: "reduzir", tamMin: 28 } },
};

/** Places a w×h box centred on a drop point, kept inside the page. */
function centrar(pos: Ponto | undefined, w: number, h: number, padrao: Ponto): Ponto {
  if (!pos) return padrao;
  return { x: Math.round(Math.min(1080 - w / 2, Math.max(-w / 2, pos.x - w / 2))), y: Math.round(Math.min(1350 - h / 2, Math.max(-h / 2, pos.y - h / 2))) };
}

const LIMITE_HISTORICO = 100;
let ultimoGrupo: string | null = null;

export function estadoInicial(pacote: PacoteProva): EstadoEditor {
  return { pacote, variante: "A", pagina: 0, selecao: null, passado: [], futuro: [] };
}

function novoId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 8)}`;
}

function comPaginas(p: PacoteProva, v: Variante, f: (pags: Pagina[]) => Pagina[]): PacoteProva {
  return { ...p, variantes: { ...p.variantes, [v]: { ...p.variantes[v], paginas: f(p.variantes[v].paginas) } } };
}

function comPagina(p: PacoteProva, v: Variante, i: number, f: (pg: Pagina) => Pagina): PacoteProva {
  return comPaginas(p, v, (pags) => pags.map((pg, j) => (j === i ? f(pg) : pg)));
}

/** Records history; consecutive edits with the same group key (typing, dragging a field) merge into one undo step. */
function aplicar(s: EstadoEditor, novo: PacoteProva, grupo?: string, extra: Partial<EstadoEditor> = {}): EstadoEditor {
  const juntar = grupo !== undefined && grupo === ultimoGrupo && s.passado.length > 0;
  ultimoGrupo = grupo ?? null;
  return {
    ...s,
    ...extra,
    pacote: novo,
    passado: juntar ? s.passado : [...s.passado, s.pacote].slice(-LIMITE_HISTORICO),
    futuro: [],
  };
}

export function reduzir(s: EstadoEditor, a: Acao): EstadoEditor {
  if (a.tipo !== "camada" && a.tipo !== "texto") ultimoGrupo = null;
  const pg = s.pacote.variantes[s.variante].paginas[s.pagina];
  switch (a.tipo) {
    case "carregar":
      return estadoInicial(a.pacote);
    case "variante":
      return { ...s, variante: a.variante, pagina: Math.min(s.pagina, s.pacote.variantes[a.variante].paginas.length - 1), selecao: null };
    case "pagina":
      return { ...s, pagina: a.indice, selecao: null };
    case "selecionar":
      return { ...s, selecao: a.id };
    case "camada":
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({
        ...p, camadas: p.camadas.map((c) => (c.id === a.id ? ({ ...c, ...a.patch } as Camada) : c)),
      })), a.agrupar);
    case "texto": {
      // Shared editorial content: both variants reference it, so the change shows in A and B.
      const slides: SlideEditorial[] = s.pacote.conteudo.slides.map((sl) => (sl.id === a.slide ? { ...sl, [a.campo]: a.valor } : sl));
      return aplicar(s, { ...s.pacote, conteudo: { slides } }, a.agrupar);
    }
    case "ordem": {
      const ord = [...pg.camadas].sort((x, y) => x.z - y.z);
      const i = ord.findIndex((c) => c.id === a.id);
      if (i < 0) return s;
      const [c] = ord.splice(i, 1);
      const destino = a.direcao === "topo" ? ord.length : a.direcao === "fundo" ? 0 : a.direcao === "frente" ? Math.min(i + 1, ord.length) : Math.max(i - 1, 0);
      ord.splice(destino, 0, c);
      const z = new Map(ord.map((x, k) => [x.id, k + 1]));
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: p.camadas.map((x) => ({ ...x, z: z.get(x.id)! })) })));
    }
    case "duplicarCamada": {
      const c = pg.camadas.find((x) => x.id === a.id);
      if (!c) return s;
      const topo = Math.max(...pg.camadas.map((x) => x.z));
      const copia = { ...c, id: novoId(c.tipo), x: c.x + 24, y: c.y + 24, z: topo + 1 } as Camada;
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: [...p.camadas, copia] })), undefined, { selecao: copia.id });
    }
    case "apagarCamada":
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: p.camadas.filter((c) => c.id !== a.id) })), undefined, { selecao: null });
    case "adicionar": {
      const topo = pg.camadas.length ? Math.max(...pg.camadas.map((x) => x.z)) : 0;
      let nova: Camada;
      if (a.camada === "texto") {
        const pr = PRESETS_TEXTO[a.preset ?? "livre"];
        const o = centrar(a.pos, pr.w, pr.h, { x: 90, y: 560 });
        nova = { id: novoId("texto"), nome: pr.nome, tipo: "texto", texto: pr.texto, x: o.x, y: o.y, w: pr.w, h: pr.h, z: topo + 1, estilo: { ...pr.estilo } };
      } else {
        const linha = a.camada === "linha";
        const w = linha ? 600 : 400, h = linha ? 8 : 400;
        const o = centrar(a.pos, w, h, linha ? { x: 240, y: 671 } : { x: 340, y: 475 });
        nova = { id: novoId(linha ? "ret" : a.camada), nome: linha ? "Linha" : a.camada === "ret" ? "Retângulo" : "Elipse", tipo: "forma", forma: linha ? "ret" : a.camada as "ret" | "elipse", x: o.x, y: o.y, w, h, z: topo + 1, estilo: { cor: "#f59e0b", raio: a.camada === "elipse" ? undefined : 0 } };
      }
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: [...p.camadas, nova] })), undefined, { selecao: nova.id });
    }
    case "adicionarImagem": {
      // Click: full-bleed cover behind the layers. Drop: a half-width image on top at the drop point.
      const pacote = { ...s.pacote, assets: { ...s.pacote.assets, [a.asset.id]: a.asset } };
      let nova: Camada;
      if (a.pos) {
        const w = 540, h = Math.round(540 * (a.asset.altura / a.asset.largura || 1.25));
        const o = centrar(a.pos, w, h, { x: 270, y: 337 });
        const topo = pg.camadas.length ? Math.max(...pg.camadas.map((x) => x.z)) : 0;
        nova = { id: novoId("imagem"), nome: a.nome.slice(0, 60) || "Imagem", tipo: "imagem", asset_id: a.asset.id, recorte: "cover", foco: { x: 0.5, y: 0.5 }, x: o.x, y: o.y, w, h, z: topo + 1 };
      } else {
        const baixo = pg.camadas.length ? Math.min(...pg.camadas.map((x) => x.z)) : 1;
        nova = { id: novoId("imagem"), nome: a.nome.slice(0, 60) || "Imagem", tipo: "imagem", asset_id: a.asset.id, recorte: "cover", foco: { x: 0.5, y: 0.5 }, x: 0, y: 0, w: 1080, h: 1350, z: baixo - 1 };
      }
      return aplicar(s, comPagina(pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: [...p.camadas, nova] })), undefined, { selecao: nova.id });
    }
    case "substituir":
      return aplicar(s, a.pacote, undefined, ajustar(s, a.pacote));
    case "fundo":
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({ ...p, fundo: a.cor })), "fundo");
    case "duplicarPagina": {
      const orig = s.pacote.variantes[s.variante].paginas[a.indice];
      if (!orig || s.pacote.variantes[s.variante].paginas.length >= 20) return s;
      const copia: Pagina = { ...orig, id: novoId("pag"), camadas: orig.camadas.map((c) => ({ ...c, id: novoId(c.tipo) })) };
      return aplicar(s, comPaginas(s.pacote, s.variante, (pags) => [...pags.slice(0, a.indice + 1), copia, ...pags.slice(a.indice + 1)]), undefined, { pagina: a.indice + 1, selecao: null });
    }
    case "moverPagina": {
      const pags = s.pacote.variantes[s.variante].paginas;
      if (a.para < 0 || a.para >= pags.length || a.de === a.para) return s;
      return aplicar(s, comPaginas(s.pacote, s.variante, (ps) => {
        const n = [...ps]; const [x] = n.splice(a.de, 1); n.splice(a.para, 0, x); return n;
      }), undefined, { pagina: a.para });
    }
    case "apagarPagina": {
      const pags = s.pacote.variantes[s.variante].paginas;
      if (pags.length <= 1) return s;
      return aplicar(s, comPaginas(s.pacote, s.variante, (ps) => ps.filter((_, j) => j !== a.indice)), undefined, { pagina: Math.max(0, Math.min(s.pagina, pags.length - 2)), selecao: null });
    }
    case "desfazer": {
      const anterior = s.passado[s.passado.length - 1];
      if (!anterior) return s;
      return { ...s, pacote: anterior, passado: s.passado.slice(0, -1), futuro: [s.pacote, ...s.futuro], ...ajustar(s, anterior) };
    }
    case "refazer": {
      const seguinte = s.futuro[0];
      if (!seguinte) return s;
      return { ...s, pacote: seguinte, passado: [...s.passado, s.pacote], futuro: s.futuro.slice(1), ...ajustar(s, seguinte) };
    }
  }
}

function ajustar(s: EstadoEditor, p: PacoteProva): Partial<EstadoEditor> {
  const n = p.variantes[s.variante].paginas.length;
  const pagina = Math.min(s.pagina, n - 1);
  const existe = p.variantes[s.variante].paginas[pagina].camadas.some((c) => c.id === s.selecao);
  return { pagina, selecao: existe ? s.selecao : null };
}
