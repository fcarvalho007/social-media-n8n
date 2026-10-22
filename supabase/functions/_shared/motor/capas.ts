// Three genuinely different cover proposals (pure, no AI, no cost). Each one is a distinct impact
// strategy: giant typography, an isolated data shock, or an immersive photo. The approved text is never
// changed (title/body keep their refs); text sits inside the 1:1 grid-crop square and never gets cut —
// a proposal whose text does not fit is returned with cabe=false.
import { ALTURA, LARGURA, layoutTexto, resolverTexto, type Camada, type CamadaForma, type CamadaImagem, type CamadaTexto, type ConteudoEditorial, type Medidor, type PacoteProva, type Pagina, type Variante } from "../documento-grafico/nucleo.ts";
import { contraste } from "./composicoes.ts";
import { ZONA_SEGURA } from "./enriquecer.ts";

export type CapaId = "manifesto" | "dado" | "foto";
export const CAPAS: ReadonlyArray<{ id: CapaId; nome: string; descricao: string }> = [
  { id: "manifesto", nome: "Manifesto", descricao: "Tipografia gigante como imagem, forma a sangrar a margem." },
  { id: "dado", nome: "Choque de dado", descricao: "Um número isolado em tamanho máximo sobre fundo escuro." },
  { id: "foto", nome: "Fotografia imersiva", descricao: "Imagem em fundo total, gradiente e título em baixo." },
];
export interface PropostaCapa { id: CapaId; nome: string; descricao: string; pagina: Pagina; cabe: boolean; aviso?: string; acento: string }

const HEX = /^#[0-9a-f]{6}$/i;
const TINTA = "#111316";
const sobre = (f: string) => (HEX.test(f) && contraste("#ffffff", f) >= contraste(TINTA, f) ? "#ffffff" : TINTA);
const legivel = (c: string, f: string, min = 3) => (HEX.test(c) && HEX.test(f) && contraste(c, f) >= min ? c : sobre(f));
/** Isolated figure (percentages, currency, millions, years or large numbers). */
export const DADO = /[-+]?\d+(?:[.,]\d+)?\s?(?:%|€|\$|mil milhões|milhões|mil\b|M\b|B\b)|\b\d{4,}\b|\b\d{2,3}\b/i;

const forma = (id: string, f: CamadaForma["forma"], x: number, y: number, w: number, h: number, cor: string, z = 1, extra: Partial<CamadaForma["estilo"]> = {}, opacidade?: number): CamadaForma =>
  ({ id, tipo: "forma", forma: f, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z, ...(opacidade !== undefined ? { opacidade } : {}), estilo: { cor, ...extra } });

function altura(c: CamadaTexto, tam: number, w: number, conteudo: ConteudoEditorial, m?: Medidor): number {
  const texto = resolverTexto(c, conteudo);
  if (!texto.trim()) return 0;
  const linha = c.estilo.peso >= 700 ? 1.05 : 1.3;
  if (m) {
    const l = layoutTexto(texto, { ...c.estilo, tam, linha, overflow: "cortar", maxLinhas: undefined }, w, 100_000, m);
    return Math.ceil(l.linhas.length * l.alturaLinha) + 8;
  }
  const porLinha = Math.max(1, Math.floor(w / (tam * 0.58)));
  return Math.ceil(texto.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / porLinha)), 0) * tam * linha) + 8;
}

interface Base { titulo?: CamadaTexto; corpo?: CamadaTexto; num?: CamadaTexto; imagem?: CamadaImagem }
function base(p: Pagina): Base {
  const r: Base = {};
  for (const c of p.camadas) {
    if (c.tipo === "texto" && c.ref?.endsWith(".titulo")) r.titulo ??= c;
    else if (c.tipo === "texto" && c.ref?.endsWith(".texto")) r.corpo ??= c;
    else if (c.tipo === "texto" && c.id === "num") r.num ??= c;
    else if (c.tipo === "imagem") r.imagem ??= c;
  }
  return r;
}

/** Largest size from `tams` whose height fits `hMax`; null when none fits. */
function maior(c: CamadaTexto, tams: number[], w: number, hMax: number, conteudo: ConteudoEditorial, m?: Medidor) {
  for (const t of tams) { const h = altura(c, t, w, conteudo, m); if (h <= hMax) return { tam: t, h }; }
  return null;
}
const pôr = (c: CamadaTexto, x: number, y: number, w: number, h: number, tam: number, cor: string, peso: 400 | 700 | 900, alinh: CamadaTexto["estilo"]["alinh"], z = 10): CamadaTexto =>
  ({ ...c, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.max(1, Math.round(h)), z, estilo: { ...c.estilo, tam, tamMin: tam, peso, linha: peso >= 700 ? 1.05 : 1.3, alinh, cor, overflow: "cortar", familia: peso >= 700 ? "montserrat" : "inter" } });
const seta = (cor: string): CamadaForma => forma("mod-seta", "icone", LARGURA - 96 - 56, ALTURA - 112, 56, 56, cor, 15, { icone: "seta" });
const numero = (n: CamadaTexto | undefined, cor: string): Camada[] => (n ? [{ ...n, x: 96, y: ALTURA - 104, w: 200, h: 44, estilo: { ...n.estilo, cor, alinh: "esq" } }] : []);

const TOPO = ZONA_SEGURA.gradeTopo + 25, FIM = ZONA_SEGURA.gradeBase - 10, W = LARGURA - 192;

function manifesto(p: Pagina, b: Base, marca: string, conteudo: ConteudoEditorial, m?: Medidor): PropostaCapa {
  const fundo = HEX.test(marca) ? marca : TINTA, tinta = sobre(fundo), corpoH = b.corpo ? altura(b.corpo, 36, W, conteudo, m) : 0;
  const t = b.titulo && maior(b.titulo, [150, 132, 116, 100, 88, 76], W, FIM - TOPO - 70 - (corpoH ? corpoH + 40 : 0), conteudo, m);
  const camadas: Camada[] = [
    forma("mod-capa-circulo", "elipse", LARGURA - 380, -260, 760, 760, tinta, 1, {}, 0.12),
    forma("mod-capa-barra", "ret", 96, TOPO, 160, 18, tinta, 2),
  ];
  let y = TOPO + 70;
  if (b.titulo && t) { camadas.push(pôr(b.titulo, 96, y, W, t.h, t.tam, tinta, 900, "esq")); y += t.h + 40; }
  if (b.corpo && corpoH) camadas.push(pôr(b.corpo, 96, Math.max(y, FIM - corpoH), W, corpoH, 36, tinta, 400, "esq"));
  camadas.push(...numero(b.num, tinta), seta(tinta));
  return { ...CAPAS[0], pagina: { ...p, fundo, camadas }, cabe: !b.titulo || !!t, acento: tinta === "#ffffff" ? fundo : tinta };
}

function dado(p: Pagina, b: Base, marca: string, conteudo: ConteudoEditorial, m?: Medidor): PropostaCapa {
  const fundo = TINTA, acento = legivel(marca, fundo, 3);
  const fonte = `${b.titulo ? resolverTexto(b.titulo, conteudo) : ""} ${b.corpo ? resolverTexto(b.corpo, conteudo) : ""}`;
  const achado = fonte.match(DADO)?.[0]?.trim();
  const camadas: Camada[] = [];
  let cabe = true, y = TOPO, aviso: string | undefined;
  if (achado) {
    const tam = achado.length <= 4 ? 300 : achado.length <= 7 ? 220 : 150;
    camadas.push({ id: "mod-capa-dado", nome: "Número em destaque", tipo: "texto", texto: achado, x: 96, y, w: W, h: Math.round(tam * 1.05), z: 10, estilo: { peso: 900, familia: "montserrat", tam, tamMin: tam, linha: 1, alinh: "centro", cor: acento, overflow: "cortar" } } as CamadaTexto);
    y += Math.round(tam * 1.05) + 30;
    camadas.push(forma("mod-capa-filete", "ret", LARGURA / 2 - 60, y, 120, 8, acento, 2));
    y += 50;
  } else {
    aviso = "Sem número no texto: usa um bloco de contraste.";
    camadas.push(forma("mod-capa-bloco", "ret", 0, TOPO, LARGURA, FIM - TOPO, acento, 1));
  }
  const corT = achado ? "#ffffff" : sobre(acento);
  const corpoH = b.corpo ? altura(b.corpo, 34, W, conteudo, m) : 0;
  const t = b.titulo && maior(b.titulo, achado ? [84, 72, 62, 54] : [120, 100, 88, 76, 64], W, FIM - y - (corpoH ? corpoH + 30 : 0) - (achado ? 0 : 40), conteudo, m);
  if (b.titulo) { if (!t) cabe = false; else { const yy = achado ? y : TOPO + Math.max(40, (FIM - TOPO - t.h - corpoH - 30) / 2); camadas.push(pôr(b.titulo, 96, yy, W, t.h, t.tam, corT, 900, "centro")); y = yy + t.h + 30; } }
  if (b.corpo && corpoH) camadas.push(pôr(b.corpo, 96, y, W, corpoH, 34, achado ? "#d6d9de" : corT, 400, "centro"));
  camadas.push(...numero(b.num, "#9ca3af"), seta(acento));
  return { ...CAPAS[1], pagina: { ...p, fundo, camadas }, cabe, aviso, acento };
}

function foto(p: Pagina, b: Base, imagem: CamadaImagem | undefined, marca: string, conteudo: ConteudoEditorial, m?: Medidor): PropostaCapa {
  const camadas: Camada[] = [];
  let aviso: string | undefined;
  if (imagem) camadas.push({ ...imagem, id: imagem.id, x: 0, y: 0, w: LARGURA, h: ALTURA, z: 0, recorte: "cover", mascara: undefined });
  else {
    aviso = "Imagem por escolher: abre o editor para pesquisar uma fotografia gratuita.";
    camadas.push(forma("mod-capa-marcador", "ret", 0, 0, LARGURA, ALTURA, "#3a3f47", 0));
    camadas.push({ id: "mod-capa-marcador-txt", nome: "Imagem por escolher", tipo: "texto", texto: "Imagem por escolher", x: 96, y: TOPO, w: W, h: 50, z: 3, estilo: { peso: 700, familia: "inter", tam: 30, tamMin: 30, linha: 1.2, alinh: "esq", cor: "#c7ccd3", overflow: "cortar" } } as CamadaTexto);
  }
  camadas.push(forma("mod-capa-gradiente", "gradiente", 0, ALTURA * 0.3, LARGURA, ALTURA * 0.7, "#000000", 1, { direcao: "base", intensidade: 0.92 }));
  const acento = legivel(marca, "#000000", 3);
  const corpoH = b.corpo ? altura(b.corpo, 34, W, conteudo, m) : 0;
  const t = b.titulo && maior(b.titulo, [110, 96, 84, 72, 62], W, FIM - TOPO - 160 - (corpoH ? corpoH + 30 : 0), conteudo, m);
  let fim = FIM;
  if (b.corpo && corpoH) { camadas.push(pôr(b.corpo, 96, fim - corpoH, W, corpoH, 34, "#e5e7eb", 400, "esq")); fim -= corpoH + 30; }
  if (b.titulo && t) { camadas.push(pôr(b.titulo, 96, fim - t.h, W, t.h, t.tam, "#ffffff", 900, "esq")); fim -= t.h + 30; }
  camadas.push(forma("mod-capa-acento", "ret", 96, fim - 14, 120, 12, acento, 3));
  camadas.push(...numero(b.num, "#d1d5db"), seta("#ffffff"));
  return { ...CAPAS[2], pagina: { ...p, fundo: TINTA, camadas }, cabe: !b.titulo || !!t, aviso, acento };
}

/** First image placed anywhere in the variant (reused as the cover photo). */
export function imagemDoCarrossel(pacote: PacoteProva, v: Variante): CamadaImagem | undefined {
  for (const pg of pacote.variantes[v].paginas) for (const c of pg.camadas) if (c.tipo === "imagem") return c;
  return undefined;
}

/** The three cover proposals for the first page of variant `v`. */
export function propostasCapa(pacote: PacoteProva, v: Variante, marca: string, m?: Medidor): PropostaCapa[] {
  const p = pacote.variantes[v].paginas[0];
  if (!p) return [];
  const b = base(p);
  return [manifesto(p, b, marca, pacote.conteudo, m), dado(p, b, marca, pacote.conteudo, m), foto(p, b, imagemDoCarrossel(pacote, v), marca, pacote.conteudo, m)];
}

/** Applies a chosen cover to page 1 and passes its accent to the other pages' engine decorations. */
export function aplicarCapa(pacote: PacoteProva, v: Variante, capa: PropostaCapa): PacoteProva {
  const doc = pacote.variantes[v];
  const paginas = doc.paginas.map((pg, i) => {
    if (i === 0) return capa.pagina;
    if (!HEX.test(pg.fundo) || contraste(capa.acento, pg.fundo) < 3) return pg;
    return { ...pg, camadas: pg.camadas.map((c) => (c.tipo === "forma" && (c.id === "mod-icone" || c.id === "mod-seta" || c.id.startsWith("mod-progresso")) ? { ...c, estilo: { ...c.estilo, cor: capa.acento } } : c)) };
  });
  return { ...pacote, variantes: { ...pacote.variantes, [v]: { ...doc, paginas } } };
}
