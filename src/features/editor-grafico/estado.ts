import { resolverTexto } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
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
  | { tipo: "texto"; slide: string; campo: "titulo" | "texto"; valor: string; camada?: string; agrupar?: string }
  | { tipo: "ordem"; id: string; direcao: "frente" | "tras" | "topo" | "fundo" }
  | { tipo: "duplicarCamada"; id: string }
  | { tipo: "apagarCamada"; id: string }
  | { tipo: "adicionar"; camada: "texto" | "ret" | "elipse" | "linha"; preset?: PresetTexto; pos?: Ponto }
  | { tipo: "adicionarImagem"; asset: Asset; nome: string; pos?: Ponto; modo?: ModoImagemNova }
  /** Pastes a copied layer (from any page) as a new, independent layer. */
  | { tipo: "colarCamada"; camada: Camada; assets: Record<string, Asset> }
  /** Applies only the style of a copied layer of the same type. */
  | { tipo: "colarEstilo"; id: string; origem: Camada }
  | { tipo: "substituirImagem"; id: string; asset: Asset; nome: string }
  /** Whole-document change (styles, "apply to all") recorded as one undo step. */
  | { tipo: "substituir"; pacote: PacoteProva }
  /** Temporary visual draft shown on the real canvas: no history entry (Cancelar restores, Aplicar confirms). */
  | { tipo: "previsualizar"; pacote: PacoteProva; variante?: Variante }
  /** Confirms a draft: one undo step back to `antes`. */
  | { tipo: "confirmar"; antes: PacoteProva }
  | { tipo: "fundo"; cor: string }
  | { tipo: "duplicarPagina"; indice: number }
  | { tipo: "moverPagina"; de: number; para: number }
  | { tipo: "apagarPagina"; indice: number }
  /** New logical slide after `indice`, created in both variants and in the narrative. */
  | { tipo: "inserirPagina"; indice: number; modelo: "branco" | "texto" }
  | { tipo: "desfazer" }
  | { tipo: "refazer" };

export type ModoImagemNova = "fundo" | "imagem" | "logo";
export type PresetTexto = "titulo" | "subtitulo" | "paragrafo" | "livre";
export interface Ponto { x: number; y: number }

/** Text presets for inserted layers. New layers clip instead of shrinking: the font is never reduced automatically. */
export const PRESETS_TEXTO: Record<PresetTexto, { nome: string; texto: string; w: number; h: number; estilo: CamadaTexto["estilo"] }> = {
  titulo: { nome: "Título", texto: "Título", w: 900, h: 240, estilo: { peso: 700, familia: "montserrat", tam: 88, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
  subtitulo: { nome: "Subtítulo", texto: "Subtítulo", w: 900, h: 160, estilo: { peso: 700, familia: "montserrat", tam: 56, linha: 1.15, alinh: "esq", cor: "#111111", overflow: "cortar" } },
  paragrafo: { nome: "Parágrafo", texto: "Escreve aqui o parágrafo.", w: 900, h: 300, estilo: { peso: 400, familia: "inter", tam: 40, linha: 1.35, alinh: "esq", cor: "#222222", overflow: "cortar" } },
  livre: { nome: "Texto livre", texto: "Novo texto", w: 800, h: 200, estilo: { peso: 700, tam: 64, linha: 1.15, alinh: "esq", cor: "#111111", overflow: "cortar" } },
};

/** Places a w×h box centred on a drop point, fully inside the page (later manual moves may crop on purpose). */
export function centrar(pos: Ponto | undefined, w: number, h: number, padrao: Ponto, dimensoes = { largura: 1080, altura: 1350 }): Ponto {
  if (!pos) return padrao;
  const lim = (v: number, max: number) => Math.round(Math.min(Math.max(0, max), Math.max(0, v)));
  return { x: lim(pos.x - w / 2, dimensoes.largura - w), y: lim(pos.y - h / 2, dimensoes.altura - h) };
}

/** Initial size of a dropped image: half the page width, proportional, never taller than the page. */
export function tamanhoImagemNova(largura: number, altura: number, alturaPagina = 1350): { w: number; h: number } {
  const r = altura / largura || 1.25;
  let w = 540, h = Math.round(540 * r);
  if (h > alturaPagina) { h = alturaPagina; w = Math.round(alturaPagina / r); }
  return { w, h };
}

const LIMITE_HISTORICO = 100;
let ultimoGrupo: string | null = null;

export function estadoInicial(pacote: PacoteProva): EstadoEditor {
  return { pacote, variante: pacote.variantes.A.sistema?.variante ?? "A", pagina: 0, selecao: null, passado: [], futuro: [] };
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

const slideId = (p: Pagina): string | null => {
  if (p.slide) return p.slide;
  const texto = p.camadas.find((c): c is CamadaTexto => c.tipo === "texto" && !!c.ref);
  return texto?.ref?.split(".")[0] ?? null;
};

export function reordenarSlide(p: PacoteProva, variante: Variante, de: number, para: number): PacoteProva {
  const origem = p.variantes[variante].paginas;
  if (para < 0 || para >= origem.length || de < 0 || de >= origem.length || de === para) return p;
  const ids = origem.map(slideId);
  const idOrigem = ids[de];
  if (!idOrigem || ids.filter((id) => id === idOrigem).length > 1) {
    return comPaginas(p, variante, (paginas) => {
      const novas = [...paginas];
      const removidas = novas.splice(de, 1);
      const movida = removidas[0];
      if (movida) novas.splice(para, 0, movida);
      return novas;
    });
  }
  const removidos = ids.splice(de, 1);
  const movido = removidos[0];
  if (movido === undefined) return p;
  ids.splice(para, 0, movido);
  const ordem = new Map(ids.filter((id): id is string => !!id).map((id, i) => [id, i]));
  const ordenarPaginas = (paginas: Pagina[]) => paginas.map((pg, i) => ({ pg, i, ordem: ordem.get(slideId(pg) ?? "") }))
    .sort((a, b) => (a.ordem ?? ids.length + a.i) - (b.ordem ?? ids.length + b.i)).map(({ pg }) => pg);
  const slides = p.conteudo.slides.map((slide, i) => ({ slide, i, ordem: ordem.get(slide.id) }))
    .sort((a, b) => (a.ordem ?? ids.length + a.i) - (b.ordem ?? ids.length + b.i)).map(({ slide }) => slide);
  return { ...p, conteudo: { ...p.conteudo, slides }, variantes: {
    A: { ...p.variantes.A, paginas: ordenarPaginas(p.variantes.A.paginas) },
    B: { ...p.variantes.B, paginas: ordenarPaginas(p.variantes.B.paginas) },
  } };
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
  const dimensoes = s.pacote.variantes[s.variante];
  const pg = dimensoes.paginas[s.pagina];
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
        ...p, camadas: p.camadas.map((c) => (c.id === a.id ? ({ ...c, ...a.patch, manual: true } as Camada) : c)),
      })), a.agrupar);
    case "texto": {
      // Shared editorial content: both variants reference it, so the change shows in A and B.
      const slides: SlideEditorial[] = s.pacote.conteudo.slides.map((sl) => (sl.id === a.slide ? { ...sl, [a.campo]: a.valor } : sl));
      const pacote = { ...s.pacote, conteudo: { slides } };
      const limpo = a.camada ? comPagina(pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: p.camadas.map((c) => c.id === a.camada && c.tipo === "texto" ? { ...c, marcas: (c.marcas ?? []).filter((m) => m.inicio < a.valor.length).map((m) => ({ ...m, fim: Math.min(m.fim, a.valor.length) })).filter((m) => m.fim > m.inicio) } : c) })) : pacote;
      return aplicar(s, limpo, a.agrupar);
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
      const topoZ = pg.camadas.length ? Math.max(...pg.camadas.map((x) => x.z)) : 0;
      if (a.modo === "logo") {
        const r = a.asset.altura / a.asset.largura || 1;
        const w = r > 1 ? Math.round(160 / r) : 160, h = r > 1 ? 160 : Math.round(160 * r);
        nova = { id: novoId("imagem"), nome: a.nome.slice(0, 60) || "Logótipo", tipo: "imagem", asset_id: a.asset.id, recorte: "contain", x: 1080 - 64 - w, y: dimensoes.altura - 64 - h, w, h, z: topoZ + 1 };
      } else if (a.pos || a.modo === "imagem") {
        const { w, h } = tamanhoImagemNova(a.asset.largura, a.asset.altura, dimensoes.altura);
        const o = centrar(a.pos, w, h, { x: Math.round((1080 - w) / 2), y: Math.round((dimensoes.altura - h) / 2) }, dimensoes);
        const topo = pg.camadas.length ? Math.max(...pg.camadas.map((x) => x.z)) : 0;
        nova = { id: novoId("imagem"), nome: a.nome.slice(0, 60) || "Imagem", tipo: "imagem", asset_id: a.asset.id, recorte: "cover", foco: { x: 0.5, y: 0.5 }, x: o.x, y: o.y, w, h, z: topo + 1, ...animacaoDa(a.asset) };
      } else {
        const baixo = pg.camadas.length ? Math.min(...pg.camadas.map((x) => x.z)) : 1;
        nova = { id: novoId("imagem"), nome: a.nome.slice(0, 60) || "Imagem", tipo: "imagem", asset_id: a.asset.id, recorte: "cover", foco: { x: 0.5, y: 0.5 }, x: 0, y: 0, w: dimensoes.largura, h: dimensoes.altura, z: baixo - 1, ...animacaoDa(a.asset) };
      }
      return aplicar(s, comPagina(pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: [...p.camadas, nova] })), undefined, { selecao: nova.id });
    }
    case "colarCamada": {
      const ja = pg.camadas.some((c) => c.id === a.camada.id);
      const d = ja ? 24 : 0;
      const base = { ...a.camada, id: novoId(a.camada.tipo), x: a.camada.x + d, y: a.camada.y + d, z: topoZ(pg) + 1, manual: true } as Camada;
      if (base.tipo === "texto" && base.ref) { const t = resolverTexto(base, s.pacote.conteudo); delete base.ref; base.texto = t; }
      const pacote = { ...s.pacote, assets: { ...s.pacote.assets, ...a.assets } };
      return aplicar(s, comPagina(pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: [...p.camadas, base] })), undefined, { selecao: base.id });
    }
    case "colarEstilo": {
      const alvo = pg.camadas.find((c) => c.id === a.id);
      if (!alvo || alvo.tipo !== a.origem.tipo) return s;
      let patch: Partial<Camada>;
      if (a.origem.tipo === "texto") patch = { estilo: { ...a.origem.estilo } } as Partial<Camada>;
      else if (a.origem.tipo === "imagem") patch = { recorte: a.origem.recorte, mascara: a.origem.mascara, opacidade: a.origem.opacidade } as Partial<Camada>;
      else patch = { estilo: { ...a.origem.estilo }, opacidade: a.origem.opacidade } as Partial<Camada>;
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({ ...p, camadas: p.camadas.map((c) => c.id === a.id ? ({ ...c, ...patch } as Camada) : c) })), undefined, { selecao: a.id });
    }
    case "substituirImagem": {
      const anterior = pg.camadas.find((c) => c.id === a.id);
      if (!anterior || anterior.tipo !== "imagem") return s;
      const pacote = { ...s.pacote, assets: { ...s.pacote.assets, [a.asset.id]: a.asset } };
      return aplicar(s, comPagina(pacote, s.variante, s.pagina, (p) => ({
        ...p,
        composicao: p.composicao ? { ...p.composicao, ...((p.composicao as { asset_id?: string }).asset_id === anterior.asset_id ? { asset_id: a.asset.id } : {}) } : p.composicao,
        camadas: p.camadas.map((c) => c.id === a.id ? { ...c, nome: a.nome.slice(0, 60) || "Imagem", asset_id: a.asset.id, animacao_id: undefined, duracao_ms: undefined, ...animacaoDa(a.asset), manual: true } : c),
      })), undefined, { selecao: a.id });
    }
    case "previsualizar": {
      const v = a.variante ?? s.variante;
      return { ...s, pacote: a.pacote, variante: v, pagina: Math.min(s.pagina, a.pacote.variantes[v].paginas.length - 1), selecao: null };
    }
    case "confirmar":
      return { ...s, passado: [...s.passado, a.antes].slice(-LIMITE_HISTORICO), futuro: [] };
    case "substituir":
      return aplicar(s, a.pacote, undefined, ajustar(s, a.pacote));
    case "fundo":
      return aplicar(s, comPagina(s.pacote, s.variante, s.pagina, (p) => ({ ...p, fundo: a.cor })), "fundo");
    case "duplicarPagina":
      if ((dimensoes.formato ?? "carrossel") !== "carrossel") return s; {
      const orig = s.pacote.variantes[s.variante].paginas[a.indice];
      if (!orig || s.pacote.variantes[s.variante].paginas.length >= 20) return s;
      const copia: Pagina = { ...orig, id: novoId("pag"), camadas: orig.camadas.map((c) => ({ ...c, id: novoId(c.tipo) })) };
      return aplicar(s, comPaginas(s.pacote, s.variante, (pags) => [...pags.slice(0, a.indice + 1), copia, ...pags.slice(a.indice + 1)]), undefined, { pagina: a.indice + 1, selecao: null });
    }
    case "inserirPagina": {
      const r = inserirSlide(s.pacote, s.variante, a.indice, a.modelo);
      if (!r) return s;
      return aplicar(s, r.pacote, undefined, { pagina: r.pagina, selecao: null });
    }
    case "moverPagina": {
      const pags = s.pacote.variantes[s.variante].paginas;
      if (a.para < 0 || a.para >= pags.length || a.de === a.para) return s;
      return aplicar(s, reordenarSlide(s.pacote, s.variante, a.de, a.para), undefined, { pagina: a.para, selecao: null });
    }
    case "apagarPagina": {
      const pags = s.pacote.variantes[s.variante].paginas;
      if (pags.length <= 1) return s;
      return aplicar(s, apagarSlide(s.pacote, s.variante, a.indice), undefined, { pagina: Math.max(0, Math.min(s.pagina, pags.length - 2)), selecao: null });
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
  // The active composition follows the document's visual system (so undo also restores it).
  const variante = p.variantes.A.sistema?.variante ?? s.variante;
  const n = p.variantes[variante].paginas.length;
  const pagina = Math.min(s.pagina, n - 1);
  const existe = p.variantes[variante].paginas[pagina].camadas.some((c) => c.id === s.selecao);
  return { variante, pagina, selecao: existe ? s.selecao : null };
}


export const LIMITE_PAGINAS = 20;

/**
 * Inserts a new logical slide after page `indice` of `variante`. The narrative gets a new slide entry and each
 * variant gets a page right after the page of the same slide, so order stays identical across A, B and narrative.
 * "texto" reuses the current page's composition (text layers re-pointed to the new slide, images dropped);
 * "branco" keeps only the background.
 */
export function inserirSlide(p: PacoteProva, variante: Variante, indice: number, modelo: "branco" | "texto"): { pacote: PacoteProva; pagina: number } | null {
  if ((p.variantes[variante].formato ?? "carrossel") !== "carrossel") return null;
  const base = p.variantes[variante].paginas[indice];
  if (!base) return null;
  if ((["A", "B"] as Variante[]).some((v) => p.variantes[v].paginas.length >= LIMITE_PAGINAS)) return null;
  const novo: SlideEditorial = { id: novoId("slide"), titulo: modelo === "texto" ? "Novo título" : "Novo slide", texto: modelo === "texto" ? "Escreve aqui o texto deste slide." : "" };
  const slideBase = slideId(base);
  const posNarr = slideBase ? p.conteudo.slides.findIndex((x) => x.id === slideBase) : -1;
  const slides = [...p.conteudo.slides];
  slides.splice(posNarr >= 0 ? posNarr + 1 : slides.length, 0, novo);
  let paginaNova = indice + 1;
  const variantes = { ...p.variantes };
  for (const v of ["A", "B"] as Variante[]) {
    const pags = p.variantes[v].paginas;
    let i = slideBase ? pags.findIndex((pg) => slideId(pg) === slideBase) : -1;
    if (i < 0) i = Math.min(indice, pags.length - 1);
    const modeloPg = pags[i] ?? base;
    const camadas: Camada[] = modelo === "branco" ? [] : modeloPg.camadas
      .filter((c) => c.tipo !== "imagem")
      .map((c) => {
        const id = novoId(c.tipo);
        if (c.tipo === "texto" && c.ref) {
          const campo = c.ref.split(".")[1] ?? "texto";
          return { ...c, id, ref: `${novo.id}.${campo}` } as Camada;
        }
        return { ...c, id } as Camada;
      });
    const pg: Pagina = { id: novoId("pag"), slide: novo.id, fundo: modeloPg.fundo, camadas, ...(modeloPg.papel ? { papel: modeloPg.papel } : {}) };
    const novas = [...pags.slice(0, i + 1), pg, ...pags.slice(i + 1)];
    if (v === variante) paginaNova = i + 1;
    variantes[v] = { ...p.variantes[v], paginas: novas };
  }
  return { pacote: { ...p, conteudo: { ...p.conteudo, slides }, variantes }, pagina: paginaNova };
}

/**
 * Deletes page `indice`. When it is the only page of its logical slide in this variant, the slide is removed from
 * both variants and from the narrative (mirror of inserirSlide), so A, B and narrative never drift apart.
 */
export function apagarSlide(p: PacoteProva, variante: Variante, indice: number): PacoteProva {
  const pags = p.variantes[variante].paginas;
  const alvo = pags[indice];
  if (!alvo || pags.length <= 1) return p;
  const sid = slideId(alvo);
  const unico = !!sid && pags.filter((pg) => slideId(pg) === sid).length === 1;
  const outra: Variante = variante === "A" ? "B" : "A";
  if (!unico || p.variantes[outra].paginas.filter((pg) => slideId(pg) !== sid).length < 1) {
    return comPaginas(p, variante, (ps) => ps.filter((_, j) => j !== indice));
  }
  const variantes = { ...p.variantes };
  for (const v of ["A", "B"] as Variante[]) variantes[v] = { ...p.variantes[v], paginas: p.variantes[v].paginas.filter((pg) => slideId(pg) !== sid) };
  return { ...p, conteudo: { ...p.conteudo, slides: p.conteudo.slides.filter((x) => x.id !== sid) }, variantes };
}

function topoZ(p: Pagina): number { return p.camadas.length ? Math.max(...p.camadas.map((x) => x.z)) : 0; }

function animacaoDa(asset: Asset): { animacao_id?: string; duracao_ms?: number } {
  const a = asset as Asset & { animacao_id?: string; duracao_ms?: number };
  return a.animacao_id ? { animacao_id: a.animacao_id, duracao_ms: Math.min(60000, Math.max(500, a.duracao_ms ?? 5000)) } : {};
}
