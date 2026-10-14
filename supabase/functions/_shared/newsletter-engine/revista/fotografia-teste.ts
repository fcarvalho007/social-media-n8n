// Distingue a fotografia de um envio só de teste da fotografia do envio real.
//
// Um envio para listas de teste (ex.: «Interno») grava uma fotografia com o
// HTML que saiu. Esse HTML é histórico e nunca é reescrito — mas não pode
// ditar a pré-visualização nem o próximo envio real, que têm de refletir o
// estado actual (ex.: Briefs entretanto aprovados).

export interface CampanhaDaEdicao {
  estado: string;
  /** Tipo da lista E-goi: «teste» ou outro (real). */
  tipo: string | null | undefined;
}

/**
 * Verdadeiro quando a fotografia existente só pode ter vindo de listas de
 * teste: a edição não está enviada e não existe nenhuma campanha (em qualquer
 * estado) numa lista real. Uma campanha real em curso mantém a fotografia.
 */
export function fotografiaSoDeTeste(estadoEdicao: string | null | undefined, campanhas: CampanhaDaEdicao[]): boolean {
  if (estadoEdicao === "enviada") return false;
  return !campanhas.some((c) => (c.tipo ?? "") !== "teste");
}
