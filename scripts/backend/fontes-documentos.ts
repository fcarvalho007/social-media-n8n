import type { SupabaseClient } from '@supabase/supabase-js';
import { fontesCatalogo, modificarFonte, type ConfiguracaoFontes } from '../documentos/catalogo';
import type { ContextoBackend } from './seguranca';
import { exigirEscrita } from './seguranca';
/** Writes are serialized by the existing documentos project lease in servidor.ts. */
export async function configuracaoFontes(sb: SupabaseClient, projeto: string): Promise<ConfiguracaoFontes> {
  const r = await sb.from('hub_editorial_artefactos').select('dados').eq('project_id', projeto).eq('tipo', 'resposta').eq('chave', 'documentos-fontes').maybeSingle();
  if (r.error) throw new Error('Não foi possível ler as fontes deste projeto.');
  return r.data?.dados ?? { alteradas: [], removidas: [] };
}
export async function operarFontes(sb: SupabaseClient, ctx: ContextoBackend, acao: string, a: Record<string, unknown>) {
  const atual = await configuracaoFontes(sb, ctx.projeto);
  if (acao === 'fontes') return fontesCatalogo(atual);
  exigirEscrita(ctx);
  const novo = acao === 'fonte-guardar' ? modificarFonte(atual, a.fonte) : { ...atual, alteradas: atual.alteradas.filter(f => f.id !== Number(a.fonteId)), removidas: [...new Set([...atual.removidas, Number(a.fonteId)])] };
  if (acao === 'fonte-remover' && (!Number.isSafeInteger(a.fonteId) || !fontesCatalogo(atual).some(f => f.id === a.fonteId))) throw new Error('Fonte não encontrada neste projeto.');
  const r = await sb.from('hub_editorial_artefactos').upsert({ project_id: ctx.projeto, tipo: 'resposta', chave: 'documentos-fontes', dados: novo }, { onConflict: 'project_id,tipo,chave' });
  if (r.error) throw new Error('Não foi possível guardar as fontes.');
  return fontesCatalogo(novo);
}
