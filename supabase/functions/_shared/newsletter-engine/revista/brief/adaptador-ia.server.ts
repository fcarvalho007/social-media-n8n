// Adaptador de IA do Brief. Server-only.
//
// O domínio do Brief não conhece fornecedores: pede uma chamada por papel
// (extracção, redacção, verificação) e recebe JSON. O fornecedor e o modelo
// de cada papel são configuráveis em `configuracoes.brief_modelos`; por
// omissão usa-se o cliente já existente do projecto.

import type { SupabaseClient } from "npm:npm:@supabase/supabase-js@2.57.4@2.57.4";

export type PapelIa = "extraccao" | "redaccao" | "verificacao";

export interface ModelosBrief {
  extraccao: string;
  redaccao: string;
  verificacao: string;
}

let MODELOS_PADRAO: ModelosBrief | null = null;

async function modelosPadrao(): Promise<ModelosBrief> {
  if (MODELOS_PADRAO) return MODELOS_PADRAO;
  const { MODELO_DEEPSEEK_PADRAO } = await import("../../../nl-app/lib/deepseek.server.ts");
  MODELOS_PADRAO = {
    extraccao: MODELO_DEEPSEEK_PADRAO,
    redaccao: MODELO_DEEPSEEK_PADRAO,
    verificacao: MODELO_DEEPSEEK_PADRAO,
  };
  return MODELOS_PADRAO;
}

export async function modelosBrief(sb: SupabaseClient): Promise<ModelosBrief> {
  const padrao = await modelosPadrao();
  const { data } = await sb
    .from("nl_configuracoes")
    .select("valor")
    .eq("chave", "brief_modelos")
    .maybeSingle();
  const bruto = (data as { valor: string | null } | null)?.valor;
  if (!bruto) return padrao;
  try {
    const v = JSON.parse(bruto) as Partial<ModelosBrief>;
    return {
      extraccao: v.extraccao?.trim() || padrao.extraccao,
      redaccao: v.redaccao?.trim() || padrao.redaccao,
      verificacao: v.verificacao?.trim() || padrao.verificacao,
    };
  } catch {
    return padrao;
  }
}

export interface PedidoIa {
  papel: PapelIa;
  operacao: string;
  system: string;
  user: string;
  briefId?: string | null;
  sb: SupabaseClient;
}

export interface RespostaIa<T> {
  dados: T | null;
  bruto: string;
  modelo: string;
  duracaoMs: number;
}

/**
 * Faz a chamada, devolve o JSON já interpretado e regista sempre o uso —
 * com sucesso ou com erro. O registo de custo nunca faz falhar a geração.
 */
export async function chamarIaBrief<T>(pedido: PedidoIa): Promise<RespostaIa<T>> {
  const { chamarDeepSeek, parseJsonTolerante } = await import("../../../nl-app/lib/deepseek.server.ts");
  const modelos = await modelosBrief(pedido.sb);
  const modelo = modelos[pedido.papel];

  const inicio = Date.now();
  try {
    const r = await chamarDeepSeek(pedido.system, pedido.user, { modelo, responseJson: true });
    const duracaoMs = Date.now() - inicio;
    await registarUso({
      sb: pedido.sb,
      briefId: pedido.briefId ?? null,
      operacao: pedido.operacao,
      modelo: r.modelo,
      usage: r.usage,
      duracaoMs,
      sucesso: true,
    });
    return { dados: parseJsonTolerante<T>(r.conteudo), bruto: r.conteudo, modelo: r.modelo, duracaoMs };
  } catch (e) {
    await registarUso({
      sb: pedido.sb,
      briefId: pedido.briefId ?? null,
      operacao: pedido.operacao,
      modelo,
      usage: { cacheHit: 0, cacheMiss: 0, saida: 0 },
      duracaoMs: Date.now() - inicio,
      sucesso: false,
      erro: (e as Error).message,
    });
    throw e;
  }
}

async function registarUso(args: {
  sb: SupabaseClient;
  briefId: string | null;
  operacao: string;
  modelo: string;
  usage: { cacheHit: number; cacheMiss: number; saida: number };
  duracaoMs: number;
  sucesso: boolean;
  erro?: string;
}): Promise<void> {
  try {
    const { custoUsd } = await import("../../../nl-app/edge-shared/custos-ia.ts");
    await args.sb.from("nl_ia_uso").insert({
      modelo: args.modelo,
      tokens_entrada_cache_hit: args.usage.cacheHit,
      tokens_entrada_cache_miss: args.usage.cacheMiss,
      tokens_saida: args.usage.saida,
      custo_usd: custoUsd(args.modelo, args.usage.cacheHit, args.usage.cacheMiss, args.usage.saida),
      origem: "brief",
      brief_id: args.briefId,
      operacao: args.operacao,
      duracao_ms: args.duracaoMs,
      sucesso: args.sucesso,
      erro: args.erro ?? null,
      edicao_id: null,
    });
  } catch {
    /* o registo de custo nunca bloqueia a geração */
  }
}
