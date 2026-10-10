// Contagem editorial da edição (regras do modelo v4_2).
//
// TOTAL   = notícias únicas publicadas na edição online.
// EXTRAS  = TOTAL menos as que seguem no email (notícias em foco + radar).
// Os textos nunca inferem números a partir dos exemplos: quando não há
// contagem fiável, usam-se as formulações sem número.

import type { EdicaoRevista } from "./compose.server.ts";

export interface ContagemSeleccao {
  total: number;
  noEmail: number;
  extras: number;
  /** Verdadeiro quando há total fiável para mostrar números. */
  confirmada: boolean;
  /** Texto acima do botão, no fim de «Novidades da semana». */
  intro: string;
  /** Rótulo do botão que abre a edição online. */
  botao: string;
  /** Frase de fecho, antes da assinatura. */
  fecho: string;
  /** Texto do elo dentro da frase de fecho. */
  fechoElo: string;
}

/** «1 notícia» / «19 notícias». */
export function noticiasPlural(n: number): string {
  return n === 1 ? "1 notícia" : `${n} notícias`;
}

export function contagemSeleccao(e: EdicaoRevista): ContagemSeleccao {
  const total = e.atualidades.length;
  const idsEmail = new Set<string>();
  e.destaques.forEach((d) => idsEmail.add(d.noticiaId));
  e.radar.forEach((r) => idsEmail.add(r.noticiaId));
  const noEmail = e.atualidades.filter((a) => idsEmail.has(a.noticiaId)).length;
  const extras = Math.max(0, total - noEmail);
  const confirmada = total > 0;

  if (!confirmada) {
    return {
      total, noEmail, extras, confirmada,
      intro: "A seleção continua. Encontra mais atualidades na edição online.",
      botao: "Ver a edição online",
      fecho: "Queres continuar a leitura?",
      fechoElo: "Consulta a seleção na edição online",
    };
  }

  if (extras === 0) {
    return {
      total, noEmail, extras, confirmada,
      intro: "A minha seleção de notícias desta edição.",
      botao: "Ver a edição online",
      fecho: "Queres continuar a leitura?",
      fechoElo: "Consulta a seleção na edição online",
    };
  }

  return {
    total, noEmail, extras, confirmada,
    intro: `Selecionei ${noticiasPlural(total)} para esta edição. Aqui encontras os destaques; há mais ${noticiasPlural(extras)} na edição online.`,
    botao: `Ver as ${noticiasPlural(total)}`,
    fecho: "Queres continuar a leitura?",
    fechoElo: `Explora a minha seleção de ${noticiasPlural(total)}`,
  };
}
