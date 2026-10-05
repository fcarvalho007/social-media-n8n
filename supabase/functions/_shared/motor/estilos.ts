// Visual styles for the Design step. Pure: browser and server share it. A style only changes
// colours, fonts and decorative shapes — never the text, never layer geometry of text boxes.
import { PARES_FONTES, type Camada, type DocumentoGrafico, type Familia, type Pagina } from "../documento-grafico/nucleo.ts";

export interface Paleta { fundo: string; fundoCapa: string; titulo: string; texto: string; destaque: string; discreto: string }
export interface Estilo { id: EstiloId; nome: string; descricao: string; paleta: Paleta; par: string }
export type EstiloId = "editorial" | "contraste" | "revista" | "fotografico" | "minimalista" | "didatico";

export const ESTILOS: readonly Estilo[] = [
  { id: "editorial", nome: "Editorial", descricao: "Grelha rigorosa, filetes finos, serifa.", par: "playfair-source",
    paleta: { fundo: "#f7f5ef", fundoCapa: "#f7f5ef", titulo: "#141414", texto: "#2b2b2b", destaque: "#3e5b46", discreto: "#5f5f5f" } },
  { id: "contraste", nome: "Contraste", descricao: "Painel preto assimétrico e acento vivo.", par: "montserrat-inter",
    paleta: { fundo: "#f0f0ea", fundoCapa: "#0d0d0d", titulo: "#0d0d0d", texto: "#1c1c1c", destaque: "#c8ff2e", discreto: "#555555" } },
  { id: "revista", nome: "Revista", descricao: "Título Black enorme, composição dramática.", par: "montserrat-inter",
    paleta: { fundo: "#fbf2e6", fundoCapa: "#e8452c", titulo: "#1a1411", texto: "#2a211c", destaque: "#e8452c", discreto: "#6b5a4f" } },
  { id: "fotografico", nome: "Fotográfico", descricao: "Imagem em página inteira, texto sobre gradiente.", par: "montserrat-inter",
    paleta: { fundo: "#0f1412", fundoCapa: "#0f1412", titulo: "#ffffff", texto: "#f1f5f2", destaque: "#a7c4b0", discreto: "#c7d2cb" } },
  { id: "minimalista", nome: "Minimalista", descricao: "Muito respiro, fundo claro, um só acento.", par: "montserrat-inter",
    paleta: { fundo: "#ffffff", fundoCapa: "#ffffff", titulo: "#111111", texto: "#3a3a3a", destaque: "#c9502a", discreto: "#6e6e6e" } },
  { id: "didatico", nome: "Didático", descricao: "Números grandes, ícones e progresso.", par: "montserrat-inter",
    paleta: { fundo: "#eef4f8", fundoCapa: "#1d4e6f", titulo: "#10324a", texto: "#22414f", destaque: "#1d4e6f", discreto: "#4f6e80" } },
];

export const obterEstilo = (id: unknown) => ESTILOS.find((e) => e.id === id) ?? null;

const ehCapa = (p: Pagina, i: number) => i === 0 || p.camadas.some((c) => c.id === "faixa" || (c.id === "bloco" && c.w >= 1000));
const sobre = (hex: string) => {
  const n = parseInt(hex.slice(1), 16); const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? "#16181d" : "#ffffff";
};

export interface ResultadoEstilo { doc: DocumentoGrafico; manuais: number }

/**
 * Applies palette + font pair to one variant. Layers bound to editorial text (ref) and engine
 * decorations are restyled; manual layers (free text, user shapes) keep their colours unless
 * `incluirManuais`. Images are untouched. Returns how many manual layers would be affected.
 */
export function aplicarEstilo(doc: DocumentoGrafico, paleta: Paleta, parId: string, incluirManuais = false): ResultadoEstilo {
  const par = PARES_FONTES.find((p) => p.id === parId) ?? PARES_FONTES[0];
  let manuais = 0;
  const DECOR = new Set(["faixa", "regua", "bloco"]);
  const paginas = doc.paginas.map((p, i) => {
    const capa = ehCapa(p, i);
    const fundo = capa ? paleta.fundoCapa : paleta.fundo;
    const sobreFundo = sobre(fundo);
    const camadas = p.camadas.map((c): Camada => {
      if (c.id.startsWith("mod-")) return c; // model decorations keep the colours chosen by their model
      const motor = c.tipo === "texto" ? !!c.ref || c.id === "num" : c.tipo === "forma" && DECOR.has(c.id);
      if (!motor) {
        if (c.tipo !== "imagem") manuais++;
        if (!incluirManuais || c.tipo === "imagem") return c;
      }
      if (c.tipo === "forma") {
        const corBloco = c.id === "bloco" ? paleta.destaque : capa ? sobreFundo : paleta.destaque;
        return { ...c, estilo: { ...c.estilo, cor: corBloco } };
      }
      if (c.tipo === "texto") {
        const titulo = c.ref?.endsWith(".titulo") ?? false;
        const familia: Familia = titulo || c.estilo.peso === 700 ? par.titulo : par.corpo;
        const dentroBloco = titulo && p.camadas.some((b) => b.id === "bloco" && b.tipo === "forma" && b.y <= c.y && b.y + b.h >= c.y + 10);
        const cor = c.id === "num" ? (capa ? sobreFundo : paleta.discreto)
          : dentroBloco ? sobre(paleta.destaque)
          : capa ? (fundo === paleta.fundo ? (titulo ? paleta.titulo : paleta.texto) : sobreFundo)
          : titulo ? paleta.titulo : paleta.texto;
        return { ...c, estilo: { ...c.estilo, familia, cor } };
      }
      return c;
    });
    return { ...p, fundo, camadas };
  });
  return { doc: { ...doc, paginas }, manuais: incluirManuais ? manuais : manuais };
}
