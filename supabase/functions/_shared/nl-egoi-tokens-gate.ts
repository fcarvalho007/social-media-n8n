// Pre-send gate shared by the send engine: blocks real sends until, FOR EACH LIST, its own token field
// is configured, validated and fully synced. No field id is ever borrowed from another list.
import process from "node:process";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { clienteEgoiHttp, impressaoSegredo } from "./nl-egoi-tokens.ts";
import { problemasPorLista, type ListaGate } from "./nl-egoi-tokens-gate-core.ts";
export { problemasPorLista, type ListaGate };
import { armazemSupabase } from "./nl-egoi-tokens-armazem.ts";

export async function problemasTokensEnvio(sb: SupabaseClient, apiKey: string, listas: ListaGate[]): Promise<string[]> {
  const segredo = process.env.SUBSCRICAO_SEGREDO ?? "";
  if (!segredo) return ["Segredo das subscrições por configurar."];
  if (!listas.length) return [];
  return problemasPorLista({ egoi: clienteEgoiHttp(apiKey), armazem: armazemSupabase(sb) }, listas, await impressaoSegredo(segredo));
}
