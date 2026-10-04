// Validação determinística da proposta de peças móveis devolvida pela IA.
// Client-safe: usado pela função de servidor e pelos testes.

import { posicaoValida } from "./sequencia-cronica";

export interface PropostaPecas {
  lede: string;
  ledePosicao: number;
  pullQuote: string;
  pullQuotePosicao: number;
  momento: { activo: boolean; etiqueta: string; valor: string; descricao: string; posicao: number };
  avisos: string[];
}

function txt(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .replace(/[«»"“”'‘’]/g, "")
    .replace(/[.,;:!?…]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A frase existe (sem aspas/pontuação final, maiúsculas indiferentes) no texto? */
export function citacaoLiteral(frase: string, texto: string): boolean {
  const f = normalizar(frase);
  return f.length >= 8 && normalizar(texto).includes(f);
}

/** O valor (número, percentagem…) aparece no texto? */
export function valorNoTexto(valor: string, texto: string): boolean {
  const v = valor.replace(/\s+/g, " ").trim().toLowerCase();
  return !!v && texto.replace(/\s+/g, " ").toLowerCase().includes(v);
}

export function validarPropostaPecas(
  bruto: Record<string, unknown>,
  textoCronica: string,
  totalParagrafos: number,
): PropostaPecas {
  const avisos: string[] = [];
  const pos = (v: unknown) => posicaoValida(typeof v === "number" ? v : Number(v), totalParagrafos);

  const lede = txt(bruto.lede, 400);
  if (!lede) avisos.push("A IA não devolveu uma lede utilizável.");

  let pullQuote = txt(bruto.pull_quote, 240);
  if (pullQuote && !citacaoLiteral(pullQuote, textoCronica)) {
    avisos.push("A frase de destaque proposta não existe tal e qual na crónica — foi descartada.");
    pullQuote = "";
  }

  const m = (bruto.momento ?? {}) as Record<string, unknown>;
  const valor = txt(m.valor, 40);
  const valorOk = !!valor && valorNoTexto(valor, textoCronica);
  if (valor && !valorOk) avisos.push("O número proposto para o momento editorial não aparece no texto — o momento fica desligado.");

  return {
    lede,
    ledePosicao: pos(bruto.lede_posicao ?? 0),
    pullQuote,
    pullQuotePosicao: pos(bruto.pull_quote_posicao),
    momento: valorOk
      ? {
          activo: true,
          etiqueta: txt(m.etiqueta, 40) || "O número da semana",
          valor,
          descricao: txt(m.descricao, 200),
          posicao: pos(m.posicao),
        }
      : { activo: false, etiqueta: "", valor: "", descricao: "", posicao: totalParagrafos },
    avisos,
  };
}
