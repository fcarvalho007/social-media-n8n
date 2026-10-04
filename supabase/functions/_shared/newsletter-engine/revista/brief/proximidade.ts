// Proximidade textual entre o texto Digital Sprint e o texto da fonte.
// Módulo puro e client-safe: sem rede, sem base de dados.
//
// Objectivo editorial: não sermos republicadores. Medimos de forma
// explicável — sequências de 5 palavras repetidas, frases praticamente
// iguais e sobreposição de trigramas — e guardamos só o resultado.

export type DecisaoProximidade = "ok" | "rever" | "bloqueado";

export interface ResultadoProximidade {
  /** 0 a 1. Quanto maior, mais perto o nosso texto está da fonte. */
  score: number;
  decisao: DecisaoProximidade;
  /** Sequências mínimas que justificam a decisão (no máximo 5). */
  trechos: string[];
  /** Maior número de palavras seguidas iguais encontrado. */
  maiorSequencia: number;
}

export const LIMIAR_REVER = 0.12;
export const LIMIAR_BLOQUEIO = 0.24;
/** Uma sequência igual desta dimensão é, por si só, cópia. */
export const PALAVRAS_SEQUENCIA_BLOQUEIO = 14;

const TAMANHO_SHINGLE = 5;

export function normalizar(texto: string): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function palavras(texto: string): string[] {
  const n = normalizar(texto);
  return n ? n.split(" ") : [];
}

/** Conjunto de sequências de `n` palavras. */
export function shingles(texto: string, n = TAMANHO_SHINGLE): Set<string> {
  const p = palavras(texto);
  const out = new Set<string>();
  for (let i = 0; i + n <= p.length; i++) out.add(p.slice(i, i + n).join(" "));
  return out;
}

function trigramas(texto: string): Set<string> {
  const s = ` ${normalizar(texto)} `;
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

/** Maior número de palavras seguidas presentes nos dois textos. */
function maiorSequenciaComum(nosso: string[], fonte: Set<string>): { tamanho: number; trecho: string } {
  let melhor = { tamanho: 0, trecho: "" };
  for (let i = 0; i < nosso.length; i++) {
    let j = i + TAMANHO_SHINGLE;
    if (j > nosso.length) break;
    if (!fonte.has(nosso.slice(i, j).join(" "))) continue;
    while (j < nosso.length && fonte.has(nosso.slice(j - TAMANHO_SHINGLE + 1, j + 1).join(" "))) j += 1;
    const tamanho = j - i;
    if (tamanho > melhor.tamanho) melhor = { tamanho, trecho: nosso.slice(i, j).join(" ") };
  }
  return melhor;
}

/**
 * Compara o nosso texto com o texto da fonte. O texto da fonte é transitório:
 * nada dele é devolvido além dos trechos mínimos que justificam a decisão.
 */
export function avaliarProximidade(nosso: string, fonte: string): ResultadoProximidade {
  const nossoP = palavras(nosso);
  if (nossoP.length < TAMANHO_SHINGLE || normalizar(fonte).length < 40) {
    return { score: 0, decisao: "ok", trechos: [], maiorSequencia: 0 };
  }

  const shinglesNossos = shingles(nosso);
  const shinglesFonte = shingles(fonte);

  const repetidos: string[] = [];
  for (const s of shinglesNossos) if (shinglesFonte.has(s)) repetidos.push(s);

  const proporcao = shinglesNossos.size ? repetidos.length / shinglesNossos.size : 0;
  const sobreposicaoTri = dice(trigramas(nosso), trigramas(fonte));
  const maior = maiorSequenciaComum(nossoP, shinglesFonte);

  // A proporção de sequências copiadas manda; os trigramas só agravam.
  const score = Math.min(1, Math.max(proporcao, proporcao * 0.75 + sobreposicaoTri * 0.25));

  let decisao: DecisaoProximidade = "ok";
  if (score >= LIMIAR_BLOQUEIO || maior.tamanho >= PALAVRAS_SEQUENCIA_BLOQUEIO) decisao = "bloqueado";
  else if (score >= LIMIAR_REVER) decisao = "rever";

  const trechos = [maior.trecho, ...repetidos.filter((t) => t !== maior.trecho)]
    .filter(Boolean)
    .slice(0, 5);

  return { score: Number(score.toFixed(3)), decisao, trechos, maiorSequencia: maior.tamanho };
}
