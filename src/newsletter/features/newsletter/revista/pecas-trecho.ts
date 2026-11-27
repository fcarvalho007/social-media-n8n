// Pure helpers: turn a selected excerpt into a movable piece, and reset to the original chronicle.

export type TipoTrecho = "pull_quote" | "momento";
export type OrigemPeca = "ia" | "texto" | "mao";

export const ROTULO_ORIGEM: Record<OrigemPeca, string> = { ia: "IA", texto: "Do texto", mao: "Escrita à mão" };

export interface CamposRepor {
  cronica_lede: string; cronica_lede_posicao: number;
  pull_quote: string; pull_quote_posicao: number;
  momento_activo: boolean; momento_etiqueta: string; momento_valor: string;
  momento_descricao: string; momento_posicao: number;
  cronica_excerto: string;
}

export const ORIGINAL: CamposRepor = {
  cronica_lede: "", cronica_lede_posicao: 0, pull_quote: "", pull_quote_posicao: 99,
  momento_activo: false, momento_etiqueta: "", momento_valor: "", momento_descricao: "", momento_posicao: 99,
  cronica_excerto: "",
};

/** Snapshot of the fields «Repor crónica original» clears, so it can be undone. */
export function snapshotRepor(cfg: CamposRepor): CamposRepor {
  const s = {} as CamposRepor;
  for (const k of Object.keys(ORIGINAL) as (keyof CamposRepor)[]) (s as unknown as Record<string, unknown>)[k] = cfg[k];
  return s;
}

const limpar = (t: string) => t.replace(/\s+/g, " ").trim();

/**
 * Piece patch from a selection inside paragraph `indice` (0-based).
 * Position = after that paragraph. For «momento», the rest of the paragraph becomes the description.
 */
export function pecaDeTrecho(tipo: TipoTrecho, trecho: string, paragrafo: string, indice: number): Record<string, unknown> | null {
  const t = limpar(trecho).replace(/^[«"“]+|[»"”]+$/g, "");
  if (!t) return null;
  const pos = indice + 1;
  if (tipo === "pull_quote") return { pull_quote: t, pull_quote_posicao: pos };
  const resto = limpar(paragrafo.replace(trecho, " ")).replace(/^[,.;:—–-]\s*/, "");
  return {
    momento_activo: true, momento_valor: t, momento_descricao: resto || limpar(paragrafo),
    momento_etiqueta: "O número da semana", momento_posicao: pos,
  };
}
