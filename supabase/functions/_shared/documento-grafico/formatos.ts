/** Explicit format contract. Absence means the original carousel (backwards compatible). */
export const FORMATOS_CONTEUDO = ["carrossel", "post", "story"] as const;
export type FormatoConteudo = typeof FORMATOS_CONTEUDO[number];
export function formatoConteudo(v: unknown): FormatoConteudo {
  if (v === undefined || v === null) return "carrossel";
  if (!FORMATOS_CONTEUDO.includes(v as FormatoConteudo)) throw new Error("Formato de conteúdo inválido.");
  return v as FormatoConteudo;
}
export const CONFIG_FORMATOS = {
  carrossel: { nome: "Carrossel", largura: 1080, altura: 1350, min: 2, max: 10 },
  post: { nome: "Post", largura: 1080, altura: 1350, min: 1, max: 1 },
  story: { nome: "Story", largura: 1080, altura: 1920, min: 1, max: 1 },
} as const;
/** Conservative editing guides; never drawn into exported pixels. */
export const ZONA_SEGURA_STORY = { topo: 250, base: 250, lados: 80 } as const;
