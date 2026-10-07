// Support images (charts, tables) for the carousel source. Their human-reviewed descriptions are
// appended as extra source paragraphs, so the server's § validation covers them like pasted text.
export const MAX_IMAGENS_APOIO = 6;
export const MAX_DESCRICAO_APOIO = 1500;

export interface ImagemApoio { assetId: string; nome: string; descricao: string }

/** Paragraph text for one image; empty descriptions contribute nothing. */
export function paragrafoImagem(i: ImagemApoio, n: number): string | null {
  const d = i.descricao.replace(/\s+/g, " ").trim().slice(0, MAX_DESCRICAO_APOIO);
  return d ? `Imagem ${n} (${i.nome.trim() || "sem nome"}): ${d}` : null;
}

/** Source text plus one paragraph per described image, in upload order. */
export function comporComImagens(texto: string, imagens: ImagemApoio[]): string {
  const extra = imagens.slice(0, MAX_IMAGENS_APOIO).map((i, k) => paragrafoImagem(i, k + 1)).filter((x): x is string => !!x);
  if (!extra.length) return texto;
  return [texto.replace(/\s+$/, ""), ...extra].filter(Boolean).join("\n\n");
}
