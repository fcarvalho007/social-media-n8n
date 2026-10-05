import type { PropostaEditorial } from "../../../supabase/functions/_shared/motor/proposta";

export type ResultadoFusao =
  | { ok: true; conteudo: PropostaEditorial }
  | { ok: false; motivo: "contagem"; atual: number; proposta: number };

/**
 * Applies a framework proposal onto the current narrative without touching the composition:
 * slide ids (bound to the visual layers) are kept; text, role and § evidence come from the proposal.
 * Different slide counts are refused — the caller offers the proposal as a separate carousel instead.
 */
export function fundirProposta(atual: PropostaEditorial, proposta: PropostaEditorial): ResultadoFusao {
  if (atual.slides.length !== proposta.slides.length) {
    return { ok: false, motivo: "contagem", atual: atual.slides.length, proposta: proposta.slides.length };
  }
  return {
    ok: true,
    conteudo: {
      ...atual,
      metodo: "ia",
      demonstracao: false,
      titulo: proposta.titulo,
      slides: atual.slides.map((s, i) => ({ ...s, papel: proposta.slides[i].papel, titulo: proposta.slides[i].titulo, texto: proposta.slides[i].texto, fontes: [...proposta.slides[i].fontes] })),
      legenda: proposta.legenda,
      alt: proposta.alt ?? atual.alt,
    },
  };
}

const CHAVE = (trabalhoId: string) => `mc-estrutura:${trabalhoId}`;
export interface EstruturaPendente { trabalho: string; framework: string }
export function lerPendente(trabalhoId: string): EstruturaPendente | null {
  try { const v = localStorage.getItem(CHAVE(trabalhoId)); return v ? JSON.parse(v) as EstruturaPendente : null; } catch { return null; }
}
export function guardarPendente(trabalhoId: string, p: EstruturaPendente | null) {
  try { if (p) localStorage.setItem(CHAVE(trabalhoId), JSON.stringify(p)); else localStorage.removeItem(CHAVE(trabalhoId)); } catch { /* sem armazenamento: só nesta sessão */ }
}
