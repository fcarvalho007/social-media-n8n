import type { PedidoRefinamento } from '../../supabase/functions/_shared/roteiros/refinar';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Roteiro, BriefRoteiro, FonteRoteiro, DocumentoRoteiro, GeracaoRoteiro } from '../../supabase/functions/_shared/roteiros/modelo';
export type VersaoRoteiro = Pick<Roteiro, 'revisao' | 'brief' | 'documento' | 'criado_em'>;
export interface ApiRoteiros {
 listar(projectId: string): Promise<Roteiro[]>;
 obter(id: string): Promise<Roteiro>;
 criar(id: string, projectId: string, fonte: FonteRoteiro, brief: BriefRoteiro): Promise<Roteiro>;
 guardar(id: string, revisao: number, brief: BriefRoteiro, documento: DocumentoRoteiro): Promise<Roteiro>;
 historico(id: string): Promise<VersaoRoteiro[]>;
 geracoes(id: string): Promise<GeracaoRoteiro[]>;
 gerar(id: string, roteiro: Roteiro, pedido?: PedidoRefinamento): Promise<GeracaoRoteiro>;
 iaDisponivel?: boolean;
}
const db = supabase as unknown as SupabaseClient;
function falha(error: { code?: string; message: string }) {
 if (['42P01', 'PGRST202', 'PGRST205'].includes(error.code ?? '')) return new Error('O módulo de roteiros ainda não está instalado nesta base de dados. Aplica as migrações 0045 e 0046 e a função rv-roteiros.');
 return new Error(error.message);
}
async function rpc<T>(name: string, args: object): Promise<T> { const { data, error } = await db.rpc(name, args); if (error) throw falha(error); return data as T; }
export const apiRoteiros: ApiRoteiros = {
 listar: async project => { const { data, error } = await db.from('rv_roteiros').select('*').eq('project_id', project).order('atualizado_em', { ascending: false }).limit(100); if (error) throw falha(error); return data as Roteiro[]; },
 obter: async id => { const { data, error } = await db.from('rv_roteiros').select('*').eq('id', id).single(); if (error) throw falha(error); return data as Roteiro; },
 criar: (id, project, fonte, brief) => rpc('rv_criar', { _id: id, _project_id: project, _fonte: fonte, _brief: brief }),
 guardar: (id, revisao, brief, documento) => rpc('rv_guardar', { _id: id, _revisao: revisao, _brief: brief, _documento: documento }),
 historico: async id => { const { data, error } = await db.from('rv_versoes').select('revisao,brief,documento,criado_em').eq('roteiro_id', id).order('revisao', { ascending: false }).limit(50); if (error) throw falha(error); return data as VersaoRoteiro[]; },
 geracoes: async id => { const { data, error } = await db.from('rv_geracoes').select('*').eq('roteiro_id', id).order('criado_em', { ascending: false }).limit(20); if (error) throw falha(error); return data as GeracaoRoteiro[]; },
 gerar: async (id, roteiro, pedido) => {
  const { data, error } = await db.functions.invoke('rv-roteiros', { body: { id, roteiro_id: roteiro.id, revisao: roteiro.revisao, confirmar: true, pedido } });
  if (error) { const ctx = (error as { context?: Response }).context; const body = ctx ? await ctx.json().catch(() => null) : null; throw new Error(body?.error ?? 'Não foi possível confirmar o pedido. Atualiza as propostas antes de voltar a gerar.'); }
  return data as GeracaoRoteiro;
 },
};
