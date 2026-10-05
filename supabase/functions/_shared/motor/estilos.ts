// Visual styles for the Design step. Pure: browser and server share it. A style only changes
// colours, fonts and decorative shapes — never the text, never layer geometry of text boxes.
import { PARES_FONTES, type Camada, type DocumentoGrafico, type Familia, type Pagina } from "../documento-grafico/nucleo.ts";

export interface Paleta { fundo: string; fundoCapa: string; titulo: string; texto: string; destaque: string; discreto: string }
export interface Estilo { id: EstiloId; nome: string; descricao: string; paleta: Paleta; par: string }
export type EstiloId = "editorial" | "contraste" | "revista" | "fotografico" | "minimalista" | "didatico";

export const ESTILOS: readonly Estilo[] = [
  { id: "editorial", nome: "Editorial", descricao: "Claro, régua de cor, hierarquia firme.", par: "montserrat-inter",
    paleta: { fundo: "#f7f6f2", fundoCapa: "#3e5b46", titulo: "#16181d", texto: "#2b2f36", destaque: "#3e5b46", discreto: "#6b7280" } },
  { id: "contraste", nome: "Contraste", descricao: "Fundo escuro e destaque vivo.", par: "grotesk-inter",
    paleta: { fundo: "#121417", fundoCapa: "#121417", titulo: "#ffffff", texto: "#e5e7eb", destaque: "#f59e0b", discreto: "#9ca3af" } },
  { id: "revista", nome: "Revista", descricao: "Serifa elegante, tons quentes.", par: "playfair-source",
    paleta: { fundo: "#fbf7f0", fundoCapa: "#2a1f1a", titulo: "#2a1f1a", texto: "#4a3f38", destaque: "#b4532a", discreto: "#8a7b70" } },
  { id: "fotografico", nome: "Fotográfico", descricao: "Pensado para imagens de fundo.", par: "montserrat-inter",
    paleta: { fundo: "#0f1412", fundoCapa: "#0f1412", titulo: "#ffffff", texto: "#f1f5f2", destaque: "#a7c4b0", discreto: "#c7d2cb" } },
  { id: "minimalista", nome: "Minimalista", descricao: "Muito espaço e uma só cor.", par: "plex",
    paleta: { fundo: "#ffffff", fundoCapa: "#ffffff", titulo: "#111111", texto: "#333333", destaque: "#111111", discreto: "#8a8a8a" } },
  { id: "didatico", nome: "Didático", descricao: "Claro e amigável, para explicar passos.", par: "dmserif-dmsans",
    paleta: { fundo: "#eef4f8", fundoCapa: "#1d4e6f", titulo: "#10324a", texto: "#22414f", destaque: "#1d4e6f", discreto: "#5b7a8c" } },
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
