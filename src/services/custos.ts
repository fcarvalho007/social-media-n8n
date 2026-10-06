import { supabase } from "@/integrations/supabase/client";

export type Fornecedor = "deepseek" | "kie" | "fal" | "outros";
export type OrigemCusto = "confirmado" | "calculado" | "estimado" | "desconhecido";
export interface RegistoCusto {
  id: string; criado_em: string; fornecedor: Fornecedor; modelo: string; acao: string; estado: string;
  unidades: Record<string, number | null>; custo_eur: number | null; custo_origem: OrigemCusto;
}

const db = supabase as unknown as { rpc: (f: string) => { range: (a: number, b: number) => Promise<{ data: RegistoCusto[] | null; error: Error | null }> } };

/** Reads the unified ledger (server RPC, staff only), paging past the 1000-row default. */
export async function listarCustos(): Promise<RegistoCusto[]> {
  const todos: RegistoCusto[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.rpc("custos_registos").range(de, de + 999);
    if (error) throw error;
    const lote = (data ?? []).map((r) => ({ ...r, custo_eur: r.custo_eur == null ? null : Number(r.custo_eur) }));
    todos.push(...lote);
    if (lote.length < 1000) break;
  }
  return todos.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}
