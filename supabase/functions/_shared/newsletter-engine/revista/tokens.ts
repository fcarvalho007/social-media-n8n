// Tokens visuais do formato Revista.
// Fonte de verdade: digital-sprint-318-proposta.html (papel quente, azul
// eléctrico, lima e bloco escuro). Não acrescentar cores fora desta lista.

export const R = {
  /** Fundo à volta do cartão da edição. */
  fundoExterior: "#E8E8E3",
  /** Papel da edição. */
  fundoCartao: "#FAF9F5",
  /** Tinta principal (títulos, marca, blocos escuros). */
  navy: "#171A21",
  /** Azul de acento. */
  azul: "#0077B6",
  azulSublinhado: "#9CD3EE",
  /** Fundo azul muito suave do cartão de serviço em destaque. */
  azulSuave: "#EBF7FD",
  /** Corpo de texto. */
  texto: "#494E58",
  /** Texto secundário e metadados. */
  textoSec: "#626770",
  /** Painel claro (índice, rodapé). */
  painel: "#EEEEE8",
  filete: "#D7D9D1",
  fileteClaro: "#E3E3DC",

  /* acentos próprios da proposta */
  lima: "#E7EF84",
  escuro: "#171A21",
  escuroFilete: "#434650",
  escuroTexto: "#CCD0D8",
  ferramentaFundo: "#F0F3FA",
  ferramentaBorda: "#CDD2DF",
  ferramentaBotaoBorda: "#949BAA",
  amarelo: "#FFDC00",
  amareloFilete: "#9F8900",
  branco: "#FFFFFF",
} as const;

export const SANS = "Arial,Helvetica,sans-serif";
export const BLACK = "Arial Black,Arial Bold,Arial,Helvetica,sans-serif";
export const SERIF = "Georgia,'Times New Roman',serif";

/** Rótulo do CTA da recomendação, consoante o tipo escolhido. */
export function ctaRecomendacao(tipo: string): string {
  const t = (tipo || "").trim().toLowerCase();
  if (t === "podcast") return "Ouvir o episódio";
  if (t === "ferramenta") return "Ver ferramenta";
  if (t === "livro") return "Ver o livro";
  if (t === "curso") return "Ver o curso";
  if (t === "evento") return "Ver o evento";
  if (t === "recurso") return "Ver recurso";
  return "Saber mais";
}

export const TIPOS_RECOMENDACAO = [
  "Podcast", "Ferramenta", "Livro", "Curso", "Recurso", "Evento", "Outro",
] as const;

/** Rótulo por omissão do botão de uma notícia em foco. */
export const CTA_NOTICIA_PADRAO = "Ler a notícia";
