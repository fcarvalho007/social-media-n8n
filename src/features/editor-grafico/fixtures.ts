/**
 * Five synthetic, clearly identified fixtures for the R1 proof. No user data.
 * Each exercises one risk of browser/server equivalence.
 */
import { ALTURA, FONTE_DOC, LARGURA, type Camada, type DocumentoGrafico, type PacoteProva, type Pagina, type Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { FOTO_SINTETICA, MARCA_TRANSPARENTE } from "./assetsSinteticos";

const ASSETS = {
  [FOTO_SINTETICA.id]: { ...FOTO_SINTETICA },
  [MARCA_TRANSPARENTE.id]: { ...MARCA_TRANSPARENTE },
};

function doc(variante: Variante, paginas: Pagina[]): DocumentoGrafico {
  return { v: 1, variante, largura: LARGURA, altura: ALTURA, fonte: FONTE_DOC, paginas };
}

const titulo = (slide: string, extra: Partial<Camada> = {}, cor = "#111111", alinh: "esq" | "centro" | "dir" = "esq"): Camada => ({
  id: `${slide}-titulo`, nome: "Título", tipo: "texto", ref: `${slide}.titulo`, x: 90, y: 140, w: 900, h: 360, z: 3,
  estilo: { peso: 700, tam: 84, linha: 1.08, alinh, cor, maxLinhas: 4, overflow: "reduzir", tamMin: 40 },
  ...extra,
} as Camada);

const corpo = (slide: string, extra: Partial<Camada> = {}, cor = "#2b2b2b", alinh: "esq" | "centro" | "dir" = "esq"): Camada => ({
  id: `${slide}-texto`, nome: "Texto", tipo: "texto", ref: `${slide}.texto`, x: 90, y: 560, w: 900, h: 560, z: 3,
  estilo: { peso: 400, tam: 44, linha: 1.35, alinh, cor, maxLinhas: 10, overflow: "reduzir", tamMin: 28 },
  ...extra,
} as Camada);

const faixa = (id: string, cor: string, y = 0): Camada => ({ id, nome: "Faixa", tipo: "forma", forma: "ret", x: 0, y, w: LARGURA, h: 16, z: 4, estilo: { cor } });

function pacote(id: string, nome: string, slides: PacoteProva["conteudo"]["slides"], A: Pagina[], B: Pagina[]): PacoteProva {
  return { v: 1, id, nome, sintetico: true, conteudo: { slides }, assets: ASSETS, variantes: { A: doc("A", A), B: doc("B", B) } };
}

export const FIXTURES: PacoteProva[] = [
  pacote(
    "fx-texto-longo",
    "Fixture sintética 1 — texto longo",
    [{
      id: "s1",
      titulo: "Um título deliberadamente comprido para obrigar o motor a reduzir o tamanho até caber na caixa",
      texto: "Este parágrafo sintético existe apenas para testar quebras de linha. Tem frases longas, palavras compridas como interoperabilidade e responsabilização, e continua para além do espaço disponível para confirmar que o texto é reduzido e, se ainda assim não couber, termina com reticências em vez de sair da página sem aviso nenhum ao editor.",
    }],
    [{ id: "a1", slide: "s1", fundo: "#f4f1ea", camadas: [faixa("a1-faixa", "#c2410c"), titulo("s1"), corpo("s1")] }],
    [{ id: "b1", slide: "s1", fundo: "#111827", camadas: [titulo("s1", { y: 200 }, "#f9fafb", "centro"), corpo("s1", { y: 620 }, "#e5e7eb", "centro"), faixa("b1-faixa", "#f59e0b", ALTURA - 16)] }],
  ),
  pacote(
    "fx-acentos",
    "Fixture sintética 2 — acentos pt-PT",
    [{ id: "s1", titulo: "Ação, receção e órgãos: «já não há exceção»", texto: "Ç ç Ã ã Õ õ Â â Ê ê Ô ô Á á É é Í í Ó ó Ú ú À à — “aspas”, ‘plicas’, 1.º, 2.ª, 3 €. Pôr, pôde, têm, contém, através, pública, sítio." }],
    [{ id: "a1", slide: "s1", fundo: "#ffffff", camadas: [titulo("s1"), corpo("s1")] }],
    [{ id: "b1", slide: "s1", fundo: "#fef3c7", camadas: [titulo("s1", {}, "#78350f", "dir"), corpo("s1", {}, "#451a03", "dir")] }],
  ),
  pacote(
    "fx-transparencia",
    "Fixture sintética 3 — transparência",
    [{ id: "s1", titulo: "Imagem com canal alfa sobre cor", texto: "O anel e a barra têm transparência parcial e total; o fundo deve ver-se através deles." }],
    [{ id: "a1", slide: "s1", fundo: "#0f766e", camadas: [
      { id: "a1-marca", nome: "Marca", tipo: "imagem", asset_id: MARCA_TRANSPARENTE.id, recorte: "contain", x: 340, y: 760, w: 400, h: 400, z: 2 },
      titulo("s1", {}, "#ffffff"), corpo("s1", { y: 480, h: 240 }, "#ccfbf1"),
    ] }],
    [{ id: "b1", slide: "s1", fundo: "#fafafa", camadas: [
      { id: "b1-marca", nome: "Marca", tipo: "imagem", asset_id: MARCA_TRANSPARENTE.id, recorte: "contain", x: 90, y: 90, w: 260, h: 260, z: 2, opacidade: 0.6 },
      titulo("s1", { y: 420 }), corpo("s1", { y: 820, h: 400 }),
    ] }],
  ),
  pacote(
    "fx-recorte",
    "Fixture sintética 4 — recorte",
    [{ id: "s1", titulo: "Recorte com ponto focal", texto: "A mesma imagem 4:3 recortada em formato vertical, com foco à direita." }],
    [{ id: "a1", slide: "s1", fundo: "#000000", camadas: [
      { id: "a1-foto", nome: "Fotografia", tipo: "imagem", asset_id: FOTO_SINTETICA.id, recorte: "cover", foco: { x: 0.8, y: 0.5 }, x: 0, y: 0, w: LARGURA, h: 860, z: 1 },
      titulo("s1", { y: 900, h: 200 }, "#ffffff"), corpo("s1", { y: 1110, h: 180 }, "#d4d4d4"),
    ] }],
    [{ id: "b1", slide: "s1", fundo: "#e7e5e4", camadas: [
      { id: "b1-foto", nome: "Fotografia", tipo: "imagem", asset_id: FOTO_SINTETICA.id, recorte: "cover", foco: { x: 0.2, y: 0.3 }, x: 90, y: 90, w: 900, h: 600, z: 1 },
      titulo("s1", { y: 740, h: 220 }), corpo("s1", { y: 970, h: 300 }),
    ] }],
  ),
  pacote(
    "fx-sobreposicao",
    "Fixture sintética 5 — sobreposição",
    [{ id: "s1", titulo: "Três camadas sobrepostas", texto: "Elipse por baixo, retângulo semitransparente no meio e texto por cima: a ordem tem de ser igual nas duas renderizações." }],
    [{ id: "a1", slide: "s1", fundo: "#f8fafc", camadas: [
      { id: "a1-elipse", nome: "Elipse", tipo: "forma", forma: "elipse", x: 140, y: 300, w: 800, h: 800, z: 1, estilo: { cor: "#2563eb" } },
      { id: "a1-ret", nome: "Retângulo", tipo: "forma", forma: "ret", x: 60, y: 520, w: 960, h: 420, z: 2, opacidade: 0.75, estilo: { cor: "#fde68a", raio: 32 } },
      titulo("s1", { y: 560, h: 340, z: 3 }, "#111111", "centro"),
      corpo("s1", { y: 1000, h: 300 }, "#1e293b", "centro"),
    ] }],
    [{ id: "b1", slide: "s1", fundo: "#18181b", camadas: [
      { id: "b1-ret", nome: "Retângulo", tipo: "forma", forma: "ret", x: 90, y: 90, w: 900, h: 1170, z: 1, estilo: { cor: "#27272a", raio: 48 } },
      { id: "b1-elipse", nome: "Elipse", tipo: "forma", forma: "elipse", x: 640, y: 140, w: 300, h: 300, z: 2, opacidade: 0.8, estilo: { cor: "#f43f5e" } },
      titulo("s1", { y: 480, z: 3 }, "#fafafa"), corpo("s1", { y: 860, h: 360 }, "#d4d4d8"),
    ] }],
  ),
];
