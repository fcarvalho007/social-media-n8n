// Derivação, em módulo puro e client-safe, do que exige atenção humana num
// Brief. Não há coluna «precisa de atenção»: lê-se sempre do estado, do erro
// e das notas de verificação, para nunca haver duas versões da verdade.

import type { Brief, EstadoBrief, TipoBrief } from "./tipos";

export type MotivoAtencao =
  | "geracao_falhou"
  | "fonte_invalida"
  | "factualidade"
  | "proximidade";

export interface AtencaoBrief {
  motivos: MotivoAtencao[];
  precisa: boolean;
}

const ROTULO: Record<MotivoAtencao, string> = {
  geracao_falhou: "A geração falhou",
  fonte_invalida: "Fonte inválida ou indisponível",
  factualidade: "Há afirmações sem suporte na fonte",
  proximidade: "O texto está demasiado perto do original",
};

export function rotuloMotivoAtencao(m: MotivoAtencao): string {
  return ROTULO[m];
}

type Parcial = Pick<Brief, "estado" | "erro" | "verificacao">;

/** Só é chamada a atenção quando há um problema concreto a resolver. */
export function avaliarAtencao(b: Parcial): AtencaoBrief {
  const motivos: MotivoAtencao[] = [];
  if (b.estado === "erro") motivos.push("geracao_falhou");
  if (b.verificacao?.fonte_estado === "indisponivel") motivos.push("fonte_invalida");
  if (b.verificacao?.factual === "falhou") motivos.push("factualidade");
  if (b.verificacao?.proximidade_detalhe?.decisao === "bloqueado") motivos.push("proximidade");
  return { motivos, precisa: motivos.length > 0 };
}

/** Rótulo curto mostrado junto à notícia em «A Atualidade». */
export function rotuloEstadoCurto(tipo: TipoBrief, estado: EstadoBrief, aprovada: boolean): string {
  if (estado === "erro") return "Erro";
  if (estado === "a_gerar") return "A gerar";
  if (estado === "por_gerar") return "Por gerar";
  if (tipo === "radar") return "Pronto";
  if (estado === "aprovado" || aprovada) return "Pronto";
  return "Por rever";
}
