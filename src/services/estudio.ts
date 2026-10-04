import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

// Data access for the Estúdio de Conteúdos modules (newsletter, artigos, migração).

export const ESTUDIO_MARCA_KEY = 'estudio:marca';

export async function listarProjetos() {
  const { data, error } = await supabase.from('projects').select('id,name,color').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listarEdicoes() {
  const { data, error } = await supabase
    .from('nl_edicoes')
    .select('id,numero,assunto,estado,enviada_em,data_envio_prevista,agendamento_estado')
    .order('numero', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function obterEdicao(id: string) {
  const [ed, noticias, cronica] = await Promise.all([
    supabase.from('nl_edicoes').select('*').eq('id', id).single(),
    supabase.from('nl_noticias').select('id,titulo,descricao,url,categoria,estado,ordem,destaque').eq('edicao_id', id).order('ordem'),
    supabase.from('nl_cronicas').select('id,titulo,conteudo').eq('edicao_id', id).maybeSingle(),
  ]);
  if (ed.error) throw ed.error;
  return { edicao: ed.data, noticias: noticias.data ?? [], cronica: cronica.data };
}

export async function guardarEdicao(id: string, assunto: string) {
  const { error } = await supabase.from('nl_edicoes').update({ assunto }).eq('id', id).eq('estado', 'rascunho');
  if (error) throw error;
}

export async function guardarCronica(edicaoId: string, titulo: string, conteudo: string) {
  const { error } = await supabase
    .from('nl_cronicas')
    .upsert({ edicao_id: edicaoId, titulo, conteudo }, { onConflict: 'edicao_id' });
  if (error) throw error;
}

export async function criarEdicao() {
  const { data: ult } = await supabase.from('nl_edicoes').select('numero').order('numero', { ascending: false }).limit(1);
  const numero = (ult?.[0]?.numero ?? 0) + 1;
  const { data, error } = await supabase.from('nl_edicoes').insert({ numero }).select('id').single();
  if (error) throw error;
  await supabase.rpc('nl_criar_seccoes_padrao', { _edicao_id: data.id });
  return data.id;
}

export async function listarArtigos() {
  const { data, error } = await supabase
    .from('art_rascunhos')
    .select('id,titulo,resumo,corpo,estado,project_id,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function guardarArtigo(a: { id?: string; titulo: string; resumo: string; corpo: string; project_id: string | null }) {
  const { error } = a.id
    ? await supabase.from('art_rascunhos').update(a).eq('id', a.id)
    : await supabase.from('art_rascunhos').insert(a);
  if (error) throw error;
}

export async function apagarArtigo(id: string) {
  const { error } = await supabase.from('art_rascunhos').delete().eq('id', id);
  if (error) throw error;
}

// ---- Migração ----
export async function sha256Hex(buf: ArrayBuffer) {
  const h = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function enviarPacoteStaging(userId: string, file: File) {
  const buf = await file.arrayBuffer();
  const sha = await sha256Hex(buf);
  const caminho = `${userId}/${sha}.json`;
  const { error } = await supabase.storage
    .from('nl-import-staging')
    .upload(caminho, new Blob([buf], { type: 'application/json' }), { upsert: true, contentType: 'application/json' });
  if (error) throw error;
  return { caminho, sha };
}

export async function apagarPacoteStaging(caminho: string) {
  await supabase.storage.from('nl-import-staging').remove([caminho]);
}

async function invocarImport(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('nl-import', { body });
  if (error) {
    const det = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    let msg = det;
    try { const j = JSON.parse(det); msg = typeof j.error === 'string' ? j.error : JSON.stringify(j.error); } catch { /* keep text */ }
    throw new Error(msg);
  }
  return data as Record<string, unknown>;
}

export const dryRunImport = (caminho: string) => invocarImport({ accao: 'dry_run', caminho });
export const importarLote = (caminho: string, run_id?: string) => invocarImport({ accao: 'importar', caminho, run_id });

export async function listarExecucoes() {
  const { data, error } = await supabase
    .from('nl_import_runs')
    .select('id,modo,estado,ficheiro_sha256,created_at,concluido_em')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
