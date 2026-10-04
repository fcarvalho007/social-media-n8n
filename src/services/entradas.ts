import { supabase } from "@/integrations/supabase/client";

export interface Entrada {
  id: string;
  email: string;
  sucesso: boolean;
  navegador: string | null;
  criado_em: string;
}

export const ENTRADAS_POR_PAGINA = 20;

/** Admin-only audit read (RLS enforces has_role admin); never returns tokens. */
export async function listarEntradas(pagina: number): Promise<{ linhas: Entrada[]; haMais: boolean }> {
  const inicio = pagina * ENTRADAS_POR_PAGINA;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("auth_entradas")
    .select("id, email, sucesso, navegador, criado_em")
    .order("criado_em", { ascending: false })
    .range(inicio, inicio + ENTRADAS_POR_PAGINA);
  if (error) throw error;
  const linhas = (data ?? []) as Entrada[];
  return { linhas: linhas.slice(0, ENTRADAS_POR_PAGINA), haMais: linhas.length > ENTRADAS_POR_PAGINA };
}
