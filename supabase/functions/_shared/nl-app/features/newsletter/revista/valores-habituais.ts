// Valores habituais dos blocos fixos da Revista (livro e serviços).
//
// São partilhados entre o editor («Repor valores habituais») e a criação de
// uma nova edição Revista, para que estes blocos nunca nasçam vazios — um
// bloco ligado mas sem conteúdo é omitido na pré-visualização.

export const VALORES_LIVRO = {
  livro_activo: true,
  livro_etiqueta: "Para aprofundar · Livro",
  livro_titulo: "Guia Essencial de SEO",
  livro_texto: "Uma leitura para aprofundar o tema.",
  livro_cta: "Ver o livro na FNAC",
  livro_url: "https://fredericocarvalho.pt/livro",
} as const;

export const VALORES_SERVICOS = {
  servicos_activo: true,
  servicos_cursos_activo: true,
  servicos_consultoria_activo: true,
  servicos_auditoria_activo: true,
  servicos_titulo: "Como te posso ajudar",
  servicos_intro: "Trabalho com equipas que precisam de clareza antes de investir em tecnologia.",
  servicos_cta: "Pedir uma auditoria digital",
  servicos_url: "https://fredericocarvalho.pt/auditoria",
  servicos_consultoria_texto: "Acompanhamento contínuo em estratégia digital e decisões de investimento.",
  servicos_consultoria_cta: "Conhecer a consultoria",
  servicos_consultoria_url: "https://fredericocarvalho.pt/consultoria",
  servicos_cursos_texto: "Formação à medida em marketing, dados e inteligência artificial aplicada.",
  servicos_cursos_cta: "Explorar cursos e formação",
  servicos_cursos_url: "https://fredericocarvalho.pt/formacao",
} as const;

export const VALORES_PROMOCAO = {
  promocao_activa: true,
  promocao_prefixo: "Novo curso",
  promocao_link_texto: "Curso de inteligência artificial",
  promocao_url: "https://fredericocarvalho.pt/curso-de-inteligencia-artificial/",
} as const;

/** Nome do programa usado no bloco amarelo do podcast. */
export const PODCAST_PROGRAMA = "Marketing por Idiotas";
export const PODCAST_ETIQUETA = "Podcast semanal";
export const PODCAST_CTA = "Ouvir o episódio";

/** Retira o código do episódio («… - e405s01») do título. */
export function temaDoEpisodio(titulo: string): string {
  return titulo
    .replace(/\s*[-–—]\s*e\d+s\d+\s*$/i, "")
    .replace(/\s*[-–—]\s*$/, "")
    .trim();
}

/** Valores com que uma nova edição Revista nasce. */
export const VALORES_NOVA_EDICAO_REVISTA = {
  ...VALORES_PROMOCAO,
  ...VALORES_LIVRO,
  ...VALORES_SERVICOS,
  // O bloco do podcast entra sempre: é o comportamento habitual da Revista.
  podcast_activo: true,
  podcast_etiqueta: PODCAST_ETIQUETA,
  podcast_programa: PODCAST_PROGRAMA,
  podcast_cta: PODCAST_CTA,
};
