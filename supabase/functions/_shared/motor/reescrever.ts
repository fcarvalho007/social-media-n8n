// Pure helpers for "Reescrever com IA" on one slide field: prompt, parsing and fact guard.
// The current text is never replaced server-side; the client only shows the alternatives.
import { numeros } from "./traducao.ts";

export type CampoReescrita = "titulo" | "texto";
export const LIMITE_CAMPO: Record<CampoReescrita, number> = { titulo: 400, texto: 3000 };
/** Estimated cost shown before the paid request (DeepSeek flash, short call). */
export const CUSTO_ESTIMADO_EUR = 0.001;

export interface PedidoReescrita {
  campo: CampoReescrita;
  texto: string;
  papel: string;
  tom: string;
  objetivo: string;
  publico?: string;
  vizinhos?: string;
}

export function promptReescrita(p: PedidoReescrita): { sistema: string; utilizador: string } {
  const sistema = "És um editor sénior de carrosséis para redes sociais. Escreves em português de Portugal (Acordo Ortográfico de 1990), nunca em português do Brasil, sem «você». Não inventas factos, números, nomes, datas nem promessas: usa apenas a informação do texto original. Responde só em JSON.";
  const regra = p.campo === "titulo"
    ? "É um título de slide: curto, forte, no máximo 12 palavras."
    : "É o texto de um slide: claro, legível num ecrã de telemóvel, com tamanho semelhante ao original.";
  const utilizador = [
    `Papel do slide: ${p.papel || "desenvolvimento"}`,
    `Tom: ${p.tom || "editorial"}`,
    `Intenção editorial: ${p.objetivo || "informar"}`,
    p.publico ? `Público: ${p.publico}` : "",
    p.vizinhos ? `Contexto dos slides vizinhos (não repetir):\n${p.vizinhos}` : "",
    regra,
    `Texto atual:\n${p.texto}`,
    'Escreve duas reescritas diferentes entre si e diferentes do atual, mantendo o sentido e todos os números exatamente. Formato: {"alternativas":["...","..."]}',
  ].filter(Boolean).join("\n\n");
  return { sistema, utilizador };
}

/** True when the proposal introduces no number absent from the original. */
export function semNumerosNovos(original: string, proposta: string): boolean {
  const orig = new Set(numeros(original));
  return numeros(proposta).every((n) => orig.has(n));
}

/** Parses the model output; drops empty, duplicate, identical-to-current or fact-changing proposals. */
export function lerAlternativas(bruto: string, original: string, campo: CampoReescrita): { alternativas: string[]; descartadas: number } {
  let lista: unknown = [];
  try { lista = (JSON.parse(bruto.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")) as { alternativas?: unknown }).alternativas; } catch { lista = []; }
  const brutas = (Array.isArray(lista) ? lista : []).filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  const base = original.trim();
  const vistas = new Set<string>([base]);
  const alternativas: string[] = [];
  let descartadas = 0;
  for (const a of brutas) {
    const t = a.slice(0, LIMITE_CAMPO[campo]);
    if (vistas.has(t) || !semNumerosNovos(original, t)) { descartadas++; continue; }
    vistas.add(t);
    alternativas.push(t);
    if (alternativas.length === 2) break;
  }
  return { alternativas, descartadas };
}
