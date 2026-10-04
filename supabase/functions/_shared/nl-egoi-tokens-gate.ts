// Pre-send gate shared by the send engine: blocks real sends until tokens/field/tag are validated.
import process from "node:process";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { campoTokenEgoi } from "./nl-publico-config.ts";
import { clienteEgoiHttp, impressaoSegredo, verificarProntidao } from "./nl-egoi-tokens.ts";
import { armazemSupabase } from "./nl-egoi-tokens-armazem.ts";

export async function problemasTokensEnvio(sb: SupabaseClient, apiKey: string, listas: Array<{ egoi_lista_id: string; nome: string }>): Promise<string[]> {
  const campo = campoTokenEgoi();
  const segredo = process.env.SUBSCRICAO_SEGREDO ?? "";
  if (!campo || !segredo) return ["Campo do token ou segredo das subscrições por configurar."];
  if (!listas.length) return [];
  return verificarProntidao(
    { egoi: clienteEgoiHttp(apiKey), armazem: armazemSupabase(sb) },
    { listas, campo, fp: await impressaoSegredo(segredo) },
  );
}
