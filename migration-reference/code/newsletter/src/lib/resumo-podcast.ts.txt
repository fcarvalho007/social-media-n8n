// Limpeza determinística do resumo de duas linhas do episódio do podcast.
// O limite é aplicado aqui (não no prompt/schema) para nunca falhar a chamada.

export const RESUMO_PODCAST_MAX = 200;

/** Remove links, emojis e aspas, colapsa espaços e corta em ~200 caracteres numa fronteira de palavra. */
export function limparResumoPodcast(texto: string | null | undefined): string {
  let s = (texto ?? "")
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[«"'“]+|[»"'”]+$/g, "")
    .trim();
  if ([...s].length <= RESUMO_PODCAST_MAX) return s;
  const cortado = [...s].slice(0, RESUMO_PODCAST_MAX).join("");
  const fim = cortado.lastIndexOf(" ");
  s = (fim > 120 ? cortado.slice(0, fim) : cortado).replace(/[\s,;:.–-]+$/, "");
  return `${s}…`;
}
