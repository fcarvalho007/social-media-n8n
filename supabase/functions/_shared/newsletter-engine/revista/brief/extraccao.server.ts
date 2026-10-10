// Extracção factual estruturada. Server-only.
//
// Primeira chamada do motor: não escreve o Brief. Devolve apenas factos,
// contexto e incertezas, sempre suportados pelo material fornecido.

import type { SupabaseClient } from "npm:npm:@supabase/supabase-js@2.57.4@2.57.4";

import { chamarIaBrief } from "./adaptador-ia.server.ts";
import type { FactoBrief, TipoFacto } from "./tipos.ts";

const TIPOS: TipoFacto[] = [
  "numero",
  "percentagem",
  "data",
  "preco",
  "empresa",
  "pessoa",
  "produto",
  "disponibilidade",
  "citacao",
  "outro",
];

const SISTEMA = `És um analista factual. Trabalhas exclusivamente com o material recebido. Não escreves artigo nenhum e não usas conhecimento próprio: um facto que não esteja no material não existe.

Devolve APENAS JSON válido:
{"factos":[{"afirmacao":"","tipo":"","entidade":"","valor":"","fonte":"","evidencia":"","confianca":0.9}],"contexto":[""],"incertezas":[""]}

- factos: até 12 entradas. afirmacao em pt-PT, curta e verificável. tipo: numero, percentagem, data, preco, empresa, pessoa, produto, disponibilidade, citacao ou outro. entidade: quem ou o quê. valor: o número, a data, o preço ou o país, quando existir. fonte: o endereço de onde vem. evidencia: excerto curto do material (máx. 25 palavras) que sustenta a afirmação. confianca: 0 a 1.
- Trata com especial rigor números, percentagens, datas, preços, empresas, pessoas, produtos, disponibilidade geográfica e citações.
- contexto: até 4 notas em pt-PT úteis para enquadrar, retiradas do material.
- incertezas: até 4 pontos que o material deixa por esclarecer.
- Se o material não sustentar factos, devolve listas vazias. Nunca preenchas por preencher.`;

export interface ResultadoExtraccaoFactual {
  factos: FactoBrief[];
  contexto: string[];
  incertezas: string[];
}

function normalizarFacto(bruto: Record<string, unknown>, fontePadrao: string): FactoBrief | null {
  const afirmacao = String(bruto.afirmacao ?? "").trim();
  const evidencia = String(bruto.evidencia ?? "").trim();
  if (!afirmacao || !evidencia) return null;
  const tipoBruto = String(bruto.tipo ?? "outro").trim() as TipoFacto;
  const confianca = Number(bruto.confianca);
  return {
    afirmacao,
    tipo: TIPOS.includes(tipoBruto) ? tipoBruto : "outro",
    entidade: String(bruto.entidade ?? "").trim() || undefined,
    valor: String(bruto.valor ?? "").trim() || undefined,
    fonte: String(bruto.fonte ?? "").trim() || fontePadrao,
    evidencia: evidencia.split(/\s+/).slice(0, 30).join(" "),
    confianca: Number.isFinite(confianca) ? Math.min(1, Math.max(0, confianca)) : 0.5,
  };
}

function listaDeTexto(bruto: unknown, maximo: number): string[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, maximo);
}

export async function extrairFactos(args: {
  sb: SupabaseClient;
  briefId?: string | null;
  titulo: string;
  urlFonte: string | null;
  corpo: string;
  corpoPrimaria?: string;
  urlPrimaria?: string | null;
}): Promise<ResultadoExtraccaoFactual> {
  const material = [
    `Título: ${args.titulo}`,
    args.urlFonte ? `Fonte: ${args.urlFonte}` : "",
    args.corpo ? `Texto da fonte:\n${args.corpo.slice(0, 9000)}` : "",
    args.corpoPrimaria
      ? `Texto da fonte primária (${args.urlPrimaria ?? ""}):\n${args.corpoPrimaria.slice(0, 5000)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const r = await chamarIaBrief<{ factos?: unknown; contexto?: unknown; incertezas?: unknown }>({
    papel: "extraccao",
    operacao: "extraccao_factual",
    briefId: args.briefId,
    sb: args.sb,
    system: SISTEMA,
    user: material,
  });

  const brutos = Array.isArray(r.dados?.factos) ? (r.dados.factos as Record<string, unknown>[]) : [];
  const factos = brutos
    .map((f) => normalizarFacto(f, args.urlFonte ?? ""))
    .filter((f): f is FactoBrief => Boolean(f))
    .slice(0, 12);

  return {
    factos,
    contexto: listaDeTexto(r.dados?.contexto, 4),
    incertezas: listaDeTexto(r.dados?.incertezas, 4),
  };
}
