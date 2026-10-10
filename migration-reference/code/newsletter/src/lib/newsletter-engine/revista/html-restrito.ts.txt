/** HTML editorial mínimo, seguro também no servidor (sem DOM). */
const TAGS = new Set(["p", "br", "strong", "em", "u"]);

function escTexto(s: string): string {
  return s.replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Mantém apenas parágrafos, quebras, negrito, itálico e sublinhado. */
export function htmlEditorialSeguro(valor: string | null | undefined): string {
  if (!valor) return "";
  const origem = /<[a-z][\s\S]*>/i.test(valor)
    ? valor
    : valor.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  let saida = "";
  let cursor = 0;
  for (const m of origem.matchAll(/<\/?([a-z0-9]+)(?:\s[^>]*)?\s*\/?>/gi)) {
    const indice = m.index ?? 0;
    saida += escTexto(origem.slice(cursor, indice));
    const nome = (m[1] ?? "").toLowerCase();
    if (TAGS.has(nome)) {
      if (nome === "br") saida += "<br>";
      else saida += m[0].startsWith("</") ? `</${nome}>` : `<${nome}>`;
    }
    cursor = indice + m[0].length;
  }
  saida += escTexto(origem.slice(cursor));
  return saida;
}

/** Variante sem blocos, adequada a títulos e subtítulos. */
export function htmlEditorialInline(valor: string | null | undefined): string {
  return htmlEditorialSeguro(valor)
    .replace(/<\/p>\s*<p>/g, "<br>")
    .replace(/<\/?p>/g, "");
}

/** Texto simples para resumos, validações e versões sem HTML. */
export function textoDeHtmlEditorial(valor: string | null | undefined): string {
  return htmlEditorialSeguro(valor)
    .replace(/<br>/g, "\n")
    .replace(/<\/p>\s*<p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&")
    .trim();
}