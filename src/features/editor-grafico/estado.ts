import type { Camada, PacoteProva, Pagina, SlideEditorial, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

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
  | { tipo: "adicionar"; camada: "texto" | "ret" | "elipse" }
  | { tipo: "fundo"; cor: string }
  | { tipo: "duplicarPagina"; indice: number }
  | { tipo: "moverPagina"; de: number; para: number }
  | { tipo: "apagarPagina"; indice: number }
  | { tipo: "desfazer" }
  | { tipo: "refazer" };

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
      const nova: Camada = a.camada === "texto"
        ? { id: novoId("texto"), nome: "Texto livre", tipo: "texto", texto: "Novo texto", x: 140, y: 560, w: 800, h: 200, z: topo + 1, estilo: { peso: 700, tam: 64, linha: 1.15, alinh: "esq", cor: "#111111", overflow: "reduzir", tamMin: 28 } }
        : { id: novoId(a.camada), nome: a.camada === "ret" ? "Retângulo" : "Elipse", tipo: "forma", forma: a.camada, x: 340, y: 475, w: 400, h: 400, z: topo + 1, estilo: { cor: "#f59e0b", raio: a.camada === "ret" ? 0 : undefined } };
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: [...p.camadas, nova] })), undefined, { selecao: nova.id });
    }
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
