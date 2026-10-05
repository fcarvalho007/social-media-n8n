// UI helpers for «Ler página». Limits and allowed sites stay on the server (fontes.ts); nothing here relaxes them.

/** Failures worth retrying as-is (transient); everything else is solved by pasting the text. */
const REPETIVEIS = new Set(["tempo", "rede"]);

export function acoesFalhaLink(motivo: string | null | undefined): { repetir: boolean; colar: true } {
  return { repetir: !!motivo && REPETIVEIS.has(motivo), colar: true };
}

/** Host shown while reading/after reading; null for anything that is not a full http(s) URL. */
export function dominioDe(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.replace(/^www\./, "") : null;
  } catch { return null; }
}

export function resumoLeitura(texto: string, max = 280): { caracteres: number; previa: string } {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return { caracteres: texto.length, previa: limpo.length > max ? `${limpo.slice(0, max).replace(/\s\S*$/, "")}…` : limpo };
}

export const formatarNumero = (n: number) => n.toLocaleString("pt-PT");
