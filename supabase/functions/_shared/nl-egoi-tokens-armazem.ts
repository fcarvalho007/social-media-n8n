// Service-role store for the token sync progress (tables nl_egoi_tokens_sync / nl_egoi_tokens_falhas).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { ArmazemProgresso, Falha, Progresso } from "./nl-egoi-tokens.ts";

const COLS = "egoi_lista_id, campo_id, estado, campo_validado, campo_meta, segredo_fp, offset_proximo, processados, actualizados, ja_correctos, ignorados, total_egoi, verificado_leitura, ultimo_erro, concluido_em";

export function armazemSupabase(sb: SupabaseClient): ArmazemProgresso {
  const T = "nl_egoi_tokens_sync", F = "nl_egoi_tokens_falhas";
  return {
    async ler(lista, campo) {
      const { data, error } = await sb.from(T).select(COLS).eq("egoi_lista_id", lista).eq("campo_id", campo).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Progresso | null) ?? null;
    },
    async iniciar(lista, campo, fp, recomecar) {
      const linha = {
        egoi_lista_id: lista, campo_id: campo, segredo_fp: fp, estado: "por_iniciar", campo_validado: false, campo_meta: null,
        offset_proximo: 0, processados: 0, actualizados: 0, ja_correctos: 0, ignorados: 0, total_egoi: null,
        verificado_leitura: false, ultimo_erro: null, concluido_em: null, iniciado_em: new Date().toISOString(),
      };
      // Never reset a row whose lease is still active (a running batch).
      if (recomecar) {
        const { data: viva } = await sb.from(T).select("lease_ate").eq("egoi_lista_id", lista).eq("campo_id", campo).gt("lease_ate", new Date().toISOString()).maybeSingle();
        if (viva) throw new Error("Há uma sincronização em curso nesta lista.");
        await sb.from(F).delete().eq("egoi_lista_id", lista).eq("campo_id", campo);
      }
      const q = recomecar
        ? sb.from(T).upsert(linha, { onConflict: "egoi_lista_id,campo_id" })
        : sb.from(T).upsert(linha, { onConflict: "egoi_lista_id,campo_id", ignoreDuplicates: true });
      const { error } = await q;
      if (error) throw new Error(error.message);
      const p = await this.ler(lista, campo);
      if (!p) throw new Error("Progresso não criado");
      return p;
    },
    async reservar(lista, campo, segundos) {
      const token = crypto.randomUUID();
      const agora = new Date().toISOString();
      const { data, error } = await sb.from(T)
        .update({ lease_token: token, lease_ate: new Date(Date.now() + segundos * 1000).toISOString() })
        .eq("egoi_lista_id", lista).eq("campo_id", campo)
        .or(`lease_token.is.null,lease_ate.lt.${agora}`)
        .select("lease_token");
      if (error) throw new Error(error.message);
      return data && data.length === 1 ? token : null;
    },
    async guardar(token, p) {
      const { data, error } = await sb.from(T).update({
        estado: p.estado, campo_validado: p.campo_validado, campo_meta: p.campo_meta, offset_proximo: p.offset_proximo,
        processados: p.processados, actualizados: p.actualizados, ja_correctos: p.ja_correctos, ignorados: p.ignorados,
        total_egoi: p.total_egoi, verificado_leitura: p.verificado_leitura, ultimo_erro: p.ultimo_erro,
        concluido_em: p.concluido_em, actualizado_em: new Date().toISOString(),
      }).eq("egoi_lista_id", p.egoi_lista_id).eq("campo_id", p.campo_id).eq("lease_token", token).select("campo_id");
      if (error) throw new Error(error.message);
      return Boolean(data && data.length === 1);
    },
    async libertar(lista, campo, token) {
      await sb.from(T).update({ lease_token: null, lease_ate: null }).eq("egoi_lista_id", lista).eq("campo_id", campo).eq("lease_token", token);
    },
    async registarFalha(lista, campo, contactId, motivo) {
      const { data } = await sb.from(F).select("tentativas").eq("egoi_lista_id", lista).eq("campo_id", campo).eq("contact_id", contactId).maybeSingle();
      const tentativas = ((data as { tentativas: number } | null)?.tentativas ?? 0) + 1;
      await sb.from(F).upsert({ egoi_lista_id: lista, campo_id: campo, contact_id: contactId, motivo, tentativas, resolvida: false, actualizado_em: new Date().toISOString() }, { onConflict: "egoi_lista_id,campo_id,contact_id" });
    },
    async resolverFalha(lista, campo, contactId) {
      await sb.from(F).update({ resolvida: true, actualizado_em: new Date().toISOString() }).eq("egoi_lista_id", lista).eq("campo_id", campo).eq("contact_id", contactId).eq("resolvida", false);
    },
    async falhasPendentes(lista, campo, limite) {
      const { data } = await sb.from(F).select("contact_id, motivo, tentativas").eq("egoi_lista_id", lista).eq("campo_id", campo).eq("resolvida", false).order("actualizado_em").limit(limite);
      return (data ?? []) as Falha[];
    },
    async contarFalhas(lista, campo) {
      const { count } = await sb.from(F).select("contact_id", { count: "exact", head: true }).eq("egoi_lista_id", lista).eq("campo_id", campo).eq("resolvida", false);
      return count ?? 0;
    },
  };
}
