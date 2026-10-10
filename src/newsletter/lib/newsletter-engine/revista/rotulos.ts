// Fonte única dos nomes das secções e dos limites editoriais do formato
// Revista. Email, página web pública e backup WordPress leem daqui, para
// deixar de ser possível divergirem.

export const ROTULOS_REVISTA = {
  cronica: "A crónica desta semana",
  destaques: "Destaques",
  radar: "Novidades da semana",
  atualidades: "Todas as notícias",
  recomendacao: "Recomendo",
} as const;

/** Nomes curtos para a barra de navegação da edição web. */
export const NAV_REVISTA = {
  cronica: "Crónica",
  destaques: "Destaques",
  radar: "Novidades",
  atualidades: "Notícias",
  recomendacao: "Recomendo",
} as const;

/** Notas de apoio, iguais nas três superfícies. */
export const NOTAS_REVISTA = {
  destaques: "O facto primeiro; a interpretação depois.",
  radar: "Sem comentário. Só o que vale um minuto.",
} as const;

/** Lugares editoriais: mínimo exigido e máximo aceite. */
export const LIMITES_REVISTA = {
  destaquesMin: 2,
  destaquesMax: 3,
  radarMin: 3,
} as const;
