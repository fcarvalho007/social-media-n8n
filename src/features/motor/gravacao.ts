import type { DocumentoGrafico, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarTextoNaProposta, type PropostaEditorial } from "../../../supabase/functions/_shared/motor/proposta";

export interface Gravado {
  propostaVersao: number;
  conteudo: PropostaEditorial;
  docs: Record<Variante, { versao: number; documento: DocumentoGrafico }>;
}

export interface Extras { legenda: string; alt: string[] }

export interface Pedido {
  conteudo: PropostaEditorial | null;
  documentos: Partial<Record<Variante, { versao_esperada: number; documento: DocumentoGrafico }>>;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * What must be sent to persist the editor state. Editorial changes (shared text, caption,
 * alt text) create a new proposal version and re-link BOTH variants; visual-only changes
 * send just the variant that changed. Returns null when nothing changed.
 */
export function calcularGravacao(g: Gravado, pacote: PacoteProva, extras: Extras): Pedido | null {
  const conteudoNovo = { ...aplicarTextoNaProposta(g.conteudo, pacote), legenda: extras.legenda, alt: extras.alt };
  const editorial = !igual(conteudoNovo, g.conteudo);
  const documentos: Pedido["documentos"] = {};
  for (const v of ["A", "B"] as const) {
    if (editorial || !igual(pacote.variantes[v], g.docs[v].documento)) {
      documentos[v] = { versao_esperada: g.docs[v].versao, documento: pacote.variantes[v] };
    }
  }
  if (!editorial && Object.keys(documentos).length === 0) return null;
  return { conteudo: editorial ? conteudoNovo : null, documentos };
}

export function aplicarResultado(g: Gravado, p: Pedido, r: { proposta_versao: number; documentos: Partial<Record<Variante, number>> }): Gravado {
  const docs = { ...g.docs };
  for (const v of ["A", "B"] as const) {
    const n = r.documentos[v];
    const d = p.documentos[v];
    if (n && d) docs[v] = { versao: n, documento: d.documento };
  }
  return { propostaVersao: r.proposta_versao, conteudo: p.conteudo ?? g.conteudo, docs };
}
