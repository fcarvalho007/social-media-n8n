// Semelhança entre título e descrição de uma notícia.
//
// Objectivo editorial: a descrição tem de acrescentar informação, não
// reformular o título. Aqui medimos a sobreposição de palavras de conteúdo
// (coeficiente de Dice) e, em paralelo, a sobreposição de trigramas, para
// apanhar reformulações com pequenas variações («adiciona» / «está a lançar»).

const VAZIAS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
  "em", "no", "na", "nos", "nas", "por", "para", "com", "sem", "que", "e", "ou",
  "ao", "aos", "à", "às", "se", "sua", "seu", "suas", "seus", "esta", "este",
  "isto", "já", "mais", "menos", "está", "estão", "ser", "foi", "vai", "vão",
  "the", "of", "to", "in", "on", "and", "for",
]);

export function normalizarTexto(texto: string): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Raiz grosseira: corta plurais e terminações verbais frequentes. */
function raiz(palavra: string): string {
  let p = palavra;
  p = p.replace(/(coes|cao|mente|ando|endo|indo|ada|ado|adas|ados|ar|er|ir)$/u, "");
  p = p.replace(/s$/u, "");
  return p.length >= 3 ? p : palavra;
}

function tokens(texto: string): Set<string> {
  const out = new Set<string>();
  for (const t of normalizarTexto(texto).split(" ")) {
    if (!t || t.length < 3 || VAZIAS.has(t)) continue;
    out.add(raiz(t));
  }
  return out;
}

function trigramas(texto: string): Set<string> {
  const s = ` ${normalizarTexto(texto)} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i++) out.add(s.slice(i, i + 3));
  return out;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let comuns = 0;
  for (const x of a) if (b.has(x)) comuns += 1;
  return (2 * comuns) / (a.size + b.size);
}

/**
 * Proporção das palavras de conteúdo do título que também aparecem na
 * descrição. É o sinal mais directo de «a descrição repete o título».
 */
export function coberturaDoTitulo(titulo: string, descricao: string): number {
  const t = tokens(titulo);
  const d = tokens(descricao);
  if (t.size === 0) return 0;
  let comuns = 0;
  for (const x of t) if (d.has(x)) comuns += 1;
  return comuns / t.size;
}

/** Limiar acima do qual consideramos que a descrição repete o título. */
export const LIMIAR_REPETICAO_DESCRICAO = 0.7;

export interface AvaliacaoDescricao {
  /** 0 a 1. Quanto maior, mais a descrição repete o título. */
  score: number;
  cobertura: number;
  dice: number;
  trigramas: number;
  repete: boolean;
}

export function avaliarDescricao(
  titulo: string | null | undefined,
  descricao: string | null | undefined,
): AvaliacaoDescricao {
  const t = (titulo ?? "").trim();
  const d = (descricao ?? "").trim();
  if (!t || !d) {
    return { score: 0, cobertura: 0, dice: 0, trigramas: 0, repete: false };
  }
  const cobertura = coberturaDoTitulo(t, d);
  const dicePalavras = dice(tokens(t), tokens(d));
  const diceTri = dice(trigramas(t), trigramas(d));
  // A cobertura pesa mais: é o sintoma que o editor vê.
  const score = Math.max(cobertura, dicePalavras, diceTri * 0.9);
  return {
    score,
    cobertura,
    dice: dicePalavras,
    trigramas: diceTri,
    repete: score >= LIMIAR_REPETICAO_DESCRICAO,
  };
}
