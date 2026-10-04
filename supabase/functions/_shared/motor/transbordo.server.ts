// Server-side overflow gate for approval: same core layout + fonts as the export renderer, no WASM needed.
import { parse } from "npm:opentype.js@1.3.4";
import { criarMedidor, transbordos, type FonteOT, type Medidor } from "../documento-grafico/nucleo.ts";
import { WORK_SANS_400, WORK_SANS_700 } from "../documento-grafico/fontes-b64.ts";
import type { DocumentoGrafico } from "../documento-grafico/nucleo.ts";
import { pacoteParaExportar } from "./exportacao.ts";
import type { PropostaEditorial } from "./proposta.ts";

let medidor: Medidor | null = null;
function ab(b64: string): ArrayBuffer {
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
function obterMedidor(): Medidor {
  medidor ??= criarMedidor({ 400: parse(ab(WORK_SANS_400)) as unknown as FonteOT, 700: parse(ab(WORK_SANS_700)) as unknown as FonteOT });
  return medidor;
}

/** Returns 1-based page numbers with text that does not fit. Image layers are irrelevant to text layout and are dropped. */
export function paginasComTransbordo(id: string, proposta: PropostaEditorial, doc: DocumentoGrafico): number[] {
  const semImagens = { ...doc, paginas: doc.paginas.map((p) => ({ ...p, camadas: p.camadas.filter((c) => c.tipo !== "imagem") })) } as DocumentoGrafico;
  const pacote = pacoteParaExportar(id, proposta, doc.variante, semImagens, {});
  return [...new Set(transbordos(pacote, doc.variante, obterMedidor()).map((t) => t.pagina + 1))];
}
