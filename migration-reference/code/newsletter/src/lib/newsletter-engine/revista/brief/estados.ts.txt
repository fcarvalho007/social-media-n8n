// Máquina de estados do Brief. Módulo puro e client-safe.
//
// «Alterado depois de publicado» NÃO é estado: é derivado da comparação do
// hash do conteúdo actual com `hash_publicado` (o mesmo padrão já usado na
// crónica).

import type { Brief, EstadoBrief, TipoBrief } from "./tipos";

const TRANSICOES: Record<EstadoBrief, EstadoBrief[]> = {
  por_gerar: ["a_gerar", "gerado", "erro"],
  a_gerar: ["gerado", "erro", "por_gerar"],
  gerado: ["por_rever", "aprovado", "erro", "a_gerar"],
  por_rever: ["aprovado", "erro", "a_gerar"],
  aprovado: ["publicado", "por_rever", "a_gerar", "erro"],
  publicado: ["por_rever", "a_gerar"],
  erro: ["por_gerar", "a_gerar"],
};

export function transicaoPermitida(de: EstadoBrief, para: EstadoBrief): boolean {
  if (de === para) return true;
  return (TRANSICOES[de] ?? []).includes(para);
}

export function garantirTransicao(de: EstadoBrief, para: EstadoBrief): void {
  if (!transicaoPermitida(de, para)) {
    throw new Error(`Transição inválida: ${de} → ${para}`);
  }
}

/**
 * Um Destaque só é publicável com a leitura aprovada; o Radar não exige
 * aprovação de opinião.
 */
export function exigeAprovacaoDeLeitura(tipo: TipoBrief): boolean {
  return tipo === "destaque";
}

/** Conteúdo mínimo para o Brief poder seguir para publicação. */
export function prontoParaPublicar(b: Pick<
  Brief,
  "tipo" | "estado" | "em_30_segundos" | "porque_interessa" | "leitura_aprovada" | "fonte_url"
>): { ok: boolean; motivos: string[] } {
  const motivos: string[] = [];
  if (b.em_30_segundos.length === 0) motivos.push("Falta «Em 30 segundos».");
  if (b.porque_interessa.length === 0) motivos.push("Falta «Porque interessa».");
  if (!(b.fonte_url ?? "").trim()) motivos.push("Falta a fonte original.");
  if (exigeAprovacaoDeLeitura(b.tipo) && !b.leitura_aprovada.trim()) {
    motivos.push("A leitura do Destaque ainda não foi aprovada.");
  }
  if (b.estado === "erro") motivos.push("O Brief está em erro.");
  return { ok: motivos.length === 0, motivos };
}
