// Pre-send gate shared by the send engine: blocks real sends until, FOR EACH LIST, its own token field
// is configured, validated and fully synced. No field id is ever borrowed from another list.
import process from "node:process";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { resolverCampoLista, type ListaComCampo } from "./nl-publico-config.ts";
import { clienteEgoiHttp, impressaoSegredo, verificarProntidao, type ArmazemProgresso, type ClienteEgoi } from "./nl-egoi-tokens.ts";
import { armazemSupabase } from "./nl-egoi-tokens-armazem.ts";

export type ListaGate = ListaComCampo & { egoi_lista_id: string; nome: string };

/** Pure core: per-list resolution + readiness with injected E-goi client and store. */
export async function problemasPorLista(deps: { egoi: ClienteEgoi; armazem: ArmazemProgresso }, listas: ListaGate[], fp: string): Promise<string[]> {
  const problemas: string[] = [];
  for (const l of listas) {
    const r = resolverCampoLista(l);
    if (!r) {
      problemas.push(l.campo_token_id != null
        ? `Lista «${l.nome}»: o campo do token configurado é inválido.`
        : `Lista «${l.nome}»: falta escolher o campo do token (Ligações → Envio da newsletter).`);
      continue;
    }
    problemas.push(...await verificarProntidao(deps, { listas: [l], campo: r.campo, fp }));
  }
  return problemas;
}

export async function problemasTokensEnvio(sb: SupabaseClient, apiKey: string, listas: ListaGate[]): Promise<string[]> {
  const segredo = process.env.SUBSCRICAO_SEGREDO ?? "";
  if (!segredo) return ["Segredo das subscrições por configurar."];
  if (!listas.length) return [];
  return problemasPorLista({ egoi: clienteEgoiHttp(apiKey), armazem: armazemSupabase(sb) }, listas, await impressaoSegredo(segredo));
}
