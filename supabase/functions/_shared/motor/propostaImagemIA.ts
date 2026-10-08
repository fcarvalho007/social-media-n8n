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
  const contexto = texto.map((t) => `“${t}”`).join(" | ");
  const semTexto = "Create imagery only. Absolutely no text, letters, numbers, bullets, labels, logos, brand marks, readable screens, interfaces or charts. The studio will typeset the exact Portuguese copy separately.";
  return {
    direcaoA: cap(`${contrato}\nDirection A: restrained conceptual editorial image with one clear focal point and generous quiet space for editable typography. Content context only: ${contexto}. ${semTexto}`),
    direcaoB: cap(`${contrato}\nDirection B: bolder photographic editorial image with a distinctly different crop and visual rhythm, while protecting a calm area for editable typography. Content context only: ${contexto}. ${semTexto}`),
  };
}