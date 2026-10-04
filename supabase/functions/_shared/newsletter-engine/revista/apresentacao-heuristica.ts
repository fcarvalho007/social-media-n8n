// Regras determinísticas da proposta de «Apresentação Revista».
//
// Tudo o que pode ser decidido sem IA fica aqui: texto limpo da crónica,
// excerto, candidata a frase de destaque, validação do valor do momento
// editorial e escolha da melhor fotografia. Client-safe e testável sem rede.

export interface FotoCandidata {
  id: number;
  largura: number;
  altura: number;
}

/** Converte o HTML da crónica em parágrafos de texto simples. */
export function paragrafosDoHtml(html: string | null | undefined): string[] {
  const bruto = (html ?? "").trim();
  if (!bruto) return [];
  const semTags = bruto
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  return semTags
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}

/** Texto simples da crónica, com parágrafos separados por linha em branco. */
export function textoDaCronica(html: string | null | undefined): string {
  return paragrafosDoHtml(html).join("\n\n");
}

/**
 * Excerto: os primeiros parágrafos completos, sem cortar frases a meio.
 * Nunca inventa texto — é sempre material da própria crónica.
 */
export function excertoSugerido(paragrafos: string[], maxCaracteres = 900): string {
  const escolhidos: string[] = [];
  let total = 0;
  for (const p of paragrafos) {
    if (escolhidos.length && total + p.length + 2 > maxCaracteres) break;
    escolhidos.push(p);
    total += p.length + 2;
    if (total >= maxCaracteres) break;
  }
  if (!escolhidos.length && paragrafos[0]) escolhidos.push(paragrafos[0]);
  return escolhidos.join("\n\n").trim();
}

function frases(texto: string): string[] {
  return texto
    .split(/(?<=[.!?…])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

function contarPalavras(t: string): number {
  return t.split(/\s+/).filter(Boolean).length;
}

/**
 * Melhor frase do próprio texto para servir de frase de destaque:
 * entre 8 e 28 palavras, afirmativa, sem números soltos a abrir.
 */
export function pullQuoteSugerida(paragrafos: string[]): string {
  const candidatas = paragrafos
    .flatMap(frases)
    .map((f) => f.replace(/^[«"'\s]+|[»"'\s]+$/g, "").trim())
    .filter((f) => {
      const n = contarPalavras(f);
      return n >= 8 && n <= 28 && !f.endsWith("?") && !/^\d/.test(f) && !/^(ou|e|mas)\b/i.test(f);
    });
  if (!candidatas.length) return "";
  const pontuar = (f: string) => {
    const n = contarPalavras(f);
    let p = 100 - Math.abs(16 - n) * 4;
    if (/[:;]/.test(f)) p -= 8;
    if (/\b(não|nunca|sempre|é|significa|obriga|muda)\b/i.test(f)) p += 8;
    if (/\bhttp|www\./i.test(f)) p -= 40;
    return p;
  };
  return [...candidatas].sort((a, b) => pontuar(b) - pontuar(a))[0] ?? "";
}

function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trava anti-invenção: o valor protagonista do momento editorial tem de
 * existir literalmente no texto da crónica.
 */
export function valorExisteNoTexto(valor: string, texto: string): boolean {
  const v = normalizar(valor).replace(/[.,]/g, "");
  if (!v) return false;
  const t = normalizar(texto).replace(/[.,]/g, "");
  return t.includes(v);
}

/** Melhor fotografia: horizontal, resolução decente e proporção perto de 3:1. */
export function escolherFoto<T extends FotoCandidata>(fotos: T[]): T | null {
  if (!fotos.length) return null;
  const pontuar = (f: T) => {
    if (!f.largura || !f.altura) return -1000;
    const racio = f.largura / f.altura;
    let p = 100 - Math.abs(racio - 3) * 25;
    if (racio < 1) p -= 80;
    if (f.largura >= 1600) p += 12;
    else if (f.largura < 900) p -= 20;
    return p;
  };
  return [...fotos].sort((a, b) => pontuar(b) - pontuar(a))[0] ?? null;
}

/** Assinatura curta e estável do texto, para não repetir propostas iguais. */
export function assinaturaTexto(texto: string): string {
  const base = normalizar(texto);
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < base.length; i += 1) {
    const c = base.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}-${base.length}`;
}
