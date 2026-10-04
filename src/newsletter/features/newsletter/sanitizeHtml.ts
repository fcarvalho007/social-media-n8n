import DOMPurify from "dompurify";

/**
 * Allowlist estrita para o HTML da crónica.
 * Só suportamos negrito, itálico, sublinhado e links.
 * `p`/`br` mantêm-se para preservar parágrafos e quebras — o Tiptap
 * emite-os naturalmente e o E-goi trata-os bem.
 * Nenhum atributo `style`, `class`, `id`, `color`, `size`, `face`
 * ou similar sobrevive ao sanitizador.
 */
const CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "a"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
};

const ATRIBUTOS_PROIBIDOS = new Set([
  "style", "class", "id", "color", "size", "face", "bgcolor",
  "align", "valign", "width", "height", "border", "cellpadding", "cellspacing",
]);

let hookRegistado = false;
function registarHook() {
  if (hookRegistado) return;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (ATRIBUTOS_PROIBIDOS.has(data.attrName)) {
      data.keepAttr = false;
    }
  });
  hookRegistado = true;
}

export function sanitizarHtmlCronica(html: string | null | undefined): string {
  if (!html) return "";
  registarHook();
  const limpo = DOMPurify.sanitize(html, CONFIG) as unknown as string;
  return limpo;
}

/** Detecta se um valor guardado é texto plano legado (sem tags HTML). */
export function ehTextoPlano(v: string | null | undefined): boolean {
  if (!v) return true;
  return !/<[a-z][\s\S]*>/i.test(v);
}

/** Converte texto plano legado em HTML mínimo com parágrafos. */
export function textoPlanoParaHtml(txt: string): string {
  return txt
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>").trim()}</p>`)
    .filter((p) => p !== "<p></p>")
    .join("");
}

/** Normaliza qualquer valor guardado (texto plano ou HTML) num HTML sanitizado. */
export function normalizarConteudoCronica(v: string | null | undefined): string {
  if (!v) return "";
  const html = ehTextoPlano(v) ? textoPlanoParaHtml(v) : v;
  return sanitizarHtmlCronica(html);
}
