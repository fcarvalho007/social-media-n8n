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

const DOMINIOS_PODCAST = ["marketingporidiotas.pt"];

/** Só aceita páginas https do site do podcast. */
export function urlEpisodioPermitido(url: string | null | undefined): boolean {
  try {
    const u = new URL((url ?? "").trim());
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return u.protocol === "https:" && DOMINIOS_PODCAST.includes(h);
  } catch {
    return false;
  }
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Extrai o texto principal da página do episódio (sem menus, scripts, relacionados). */
export function extrairTextoEpisodio(html: string, max = 3500): string {
  let s = html ?? "";
  const ini = s.indexOf("qodef-podcast-content");
  if (ini >= 0) {
    s = s.slice(ini);
    const fim = s.search(/qodef-podcast-hosts|swiper-slide|<footer/);
    if (fim > 0) s = s.slice(0, fim);
  } else {
    const m = s.match(/<article[\s\S]*?<\/article>/i) ?? s.match(/<main[\s\S]*?<\/main>/i);
    if (!m) return "";
    s = m[0];
  }
  s = s
    .replace(/<(script|style|noscript|svg|nav|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/^[^>]*>/, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (t, n) => ENTIDADES[n.toLowerCase()] ?? t)
    .replace(/\s+/g, " ")
    .trim();
  return [...s].slice(0, max).join("");
}
