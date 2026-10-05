// Server-side overflow gate for approval: same core layout + fonts as the export renderer, no WASM needed.
import { transbordos, type Medidor } from "../documento-grafico/nucleo.ts";
import { fontesServidor } from "../documento-grafico/fontes-servidor.ts";
import type { DocumentoGrafico } from "../documento-grafico/nucleo.ts";
import { pacoteParaExportar } from "./exportacao.ts";
import type { PropostaEditorial } from "./proposta.ts";

const obterMedidor = (): Medidor => fontesServidor().medidor;

/** Returns 1-based page numbers with text that does not fit. Image layers are irrelevant to text layout and are dropped. */
export function paginasComTransbordo(id: string, proposta: PropostaEditorial, doc: DocumentoGrafico): number[] {
  const semImagens = { ...doc, paginas: doc.paginas.map((p) => ({ ...p, camadas: p.camadas.filter((c) => c.tipo !== "imagem") })) } as DocumentoGrafico;
  const pacote = pacoteParaExportar(id, proposta, doc.variante, semImagens, {});
  return [...new Set(transbordos(pacote, doc.variante, obterMedidor()).map((t) => t.pagina + 1))];
}
