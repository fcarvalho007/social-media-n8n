import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { FonteCronica } from "./carrossel.ts";
import { carrosselDivulgacao, prepararDivulgacaoBase, type DivulgacaoEdicao } from "./divulgacao.ts";

/** Idempotent preparation, retries preserve every existing editorial draft. Never calls AI. */
export async function garantirDivulgacao(sb: SupabaseClient, id: string, confirmadoEm: string | null, userId: string | null = null) {
  const { data: row, error } = await sb.from("nl_conteudos_derivados").select("fonte, carrossel, versao, divulgacao, divulgacao_versao").eq("id", id).single();
  if (error || !row) throw new Error(error?.message ?? "Rascunho não encontrado.");
  const fonte = row.fonte as FonteCronica;
  // Validate eligibility even when a draft already exists.
  const base = prepararDivulgacaoBase(fonte, confirmadoEm);
  const carrossel = row.carrossel ? null : carrosselDivulgacao(fonte); // preflight before any write
  if (!row.divulgacao) {
    const { error: e } = await sb.from("nl_conteudos_derivados").update({ divulgacao: base, divulgacao_versao: 1 })
      .eq("id", id).is("divulgacao", null).eq("divulgacao_versao", 0);
    if (e) throw new Error(e.message);
  }
  if (carrossel) {
      const { error: e } = await sb.rpc("nl_conteudos_guardar_versao", { _conteudo_id: id, _versao_esperada: row.versao,
        _carrossel: carrossel, _origem: "edicao", _utilizador: userId, _so_se_vazio: true });
      if (e) throw new Error(e.message);
  }
}

export async function guardarDivulgacao(sb: SupabaseClient, id: string, versao: number, divulgacao: DivulgacaoEdicao) {
  const { data, error } = await sb.from("nl_conteudos_derivados").update({ divulgacao, divulgacao_versao: versao + 1 })
    .eq("id", id).eq("divulgacao_versao", versao).select("divulgacao, divulgacao_versao");
  if (error) throw new Error(error.message);
  if (!data?.length) throw Object.assign(new Error("Outro editor guardou uma versão mais recente. O teu texto continua aqui; copia-o antes de reabrir o rascunho."), { status: 409 });
  return data[0];
}
