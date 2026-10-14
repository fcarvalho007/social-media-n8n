// Post-send carousel proposal: pure decision shared by the edge function and the client.
// Only a REAL send confirmed by E-goi ("sent", recorded as job.confirmado_em by the processor)
// makes the proposal ready. Test lists, accepted-but-unconfirmed, scheduled, failed or rejected
// campaigns never do.

export type EstadoProposta =
  | "nenhuma" // no real send (test only, nothing sent, failed/rejected)
  | "a_confirmar" // real campaign accepted, waiting for E-goi "sent"
  | "rever_fonte" // historical source needs human review
  | "pronta_criar" // confirmed: offer "Criar carrossel"
  | "adiada" // confirmed, user chose "Mais tarde"
  | "a_criar" // generation requested/in progress
  | "rascunho" // draft exists: offer "Abrir rascunho"
  | "erro";

export interface CampanhaProposta { estado: string; tipo: string | null | undefined }
export interface JobProposta { estado: string; confirmado_em: string | null; erro?: string | null }
export interface ConteudoProposta { tem_carrossel: boolean; adiado_em: string | null }

const ESTADOS_REAIS_EM_CURSO = new Set(["aceite", "enviada"]);

export function estadoProposta(i: {
  campanhas: CampanhaProposta[];
  job: JobProposta | null;
  conteudo: ConteudoProposta | null;
}): EstadoProposta {
  const reais = i.campanhas.filter((c) => (c.tipo ?? "") !== "teste");
  if (i.conteudo?.tem_carrossel) return "rascunho";
  const j = i.job;
  if (!j) return reais.some((c) => ESTADOS_REAIS_EM_CURSO.has(c.estado)) ? "a_confirmar" : "nenhuma";
  switch (j.estado) {
    case "aguarda_confirmacao": return "a_confirmar";
    case "aguarda_revisao_fonte": return "rever_fonte";
    case "aguarda_criacao": return i.conteudo?.adiado_em ? "adiada" : "pronta_criar";
    case "pendente":
    case "a_processar":
    case "aguarda_credencial":
      // Only reachable after confirmation or an explicit human action.
      return "a_criar";
    case "concluido": return "rascunho";
    case "erro": return "erro";
    default: return "nenhuma";
  }
}

/** Next job state once E-goi reports the campaign as "sent": wait for the explicit human click. */
export const ESTADO_APOS_CONFIRMACAO = "aguarda_criacao" as const;
