import { resolverTexto, type PacoteProva, type Variante } from "../documento-grafico/nucleo.ts";
import type { SistemaVisual } from "./sistema.ts";

const limpar = (s: string) => s.replace(/\s+/g, " ").trim();

export function textoVisivelPagina(pacote: PacoteProva, variante: Variante, indice: number): string[] {
  const pagina = pacote.variantes[variante].paginas[indice];
  if (!pagina) return [];
  return pagina.camadas
    .filter((c) => c.tipo === "texto")
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((c) => limpar(resolverTexto(c, pacote.conteudo)))
    .filter(Boolean);
}

export function promptsPropostaImagemIA(pacote: PacoteProva, sistema: SistemaVisual, variante: Variante, indice: number) {
  const texto = textoVisivelPagina(pacote, variante, indice);
  const doc = pacote.variantes[variante];
  const formato = doc.altura === 1920 ? "vertical story 9:16" : "portrait social post 4:5";
  const contrato = `Visual direction: ${sistema.estilo}; palette: ${sistema.paleta}; typography mood must remain compatible with the current direction. Format: ${formato}. Premium editorial art direction, precise hierarchy, generous safe margins, polished and distinctive.`;
  const cap = (t: string) => (t.length <= 1900 ? t : `${t.slice(0, 1899)}…`);
  return {
    apoio: cap(`${contrato}\nCreate a compelling support image for this content, leaving intentional quiet space for editable typography. Content context: ${texto.join(" | ")}`),
    final: cap(`${contrato}\nDesign the complete final social slide as one finished image. Include the following Portuguese text accurately, preserving facts and numbers. You may change hierarchy, line breaks and emphasis, but do not add claims or remove essential meaning. Text: ${texto.map((t, i) => `${i + 1}. ${t}`).join(" | ")}. Ensure excellent legibility and spelling.`),
  };
}