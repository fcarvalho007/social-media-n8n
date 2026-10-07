import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
export type DecisaoEditorial = "pendente" | "aprovada" | "rejeitada";
export interface NoticiaCurada {
  id: string; titulo: string; descricao: string | null; url: string | null; categoria: string; origem: string;
  editorial_estado: DecisaoEditorial; estado_newsletter: string; edicao_id: string | null; criado_em: string;
  nivel: "artigo" | "resumo"; usos: number; edicoes: string[];
}
export interface FonteCuradoria {
  noticia_id: string; hash: string; titulo: string; url: string | null; texto: string;
  nivel: "artigo" | "resumo"; parcial: boolean; categoria: string; origem: string;
}
export interface FiltrosCuradoria { estado?: DecisaoEditorial; query?: string; categoria?: string; desde?: string | null; pagina?: number }
// New RPCs live in migration 0039; regenerate the Cloud Database type catalog after deploying it.
const db = supabase as unknown as SupabaseClient;
async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(nome, args);
  if (error) throw new Error(error.code === "42501" ? "Não tens acesso à curadoria." : error.message);
  return data as T;
}
export const listarCuradoria = (f: FiltrosCuradoria = {}) => rpc<{ total: number; itens: NoticiaCurada[] }>("nl_curadoria_listar", {
  _estado: f.estado ?? "aprovada", _query: f.query ?? "", _categoria: f.categoria ?? "",
  _desde: f.desde ?? null, _limite: 24, _offset: (f.pagina ?? 0) * 24,
});
export const lerFonteCuradoria = (id: string) => rpc<FonteCuradoria>("nl_curadoria_snapshot", { _id: id });
export const decidirCuradoria = (id: string, estado: DecisaoEditorial) => rpc<void>("nl_curadoria_decidir", { _id: id, _estado: estado });

export const selecionarNaEdicao = (id: string, edicao: string) => rpc<string>("nl_curadoria_para_edicao", { _id: id, _edicao: edicao });
