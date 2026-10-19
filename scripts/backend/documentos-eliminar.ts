import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocumentoNuvem } from './documentos';
import { exigirEscrita, FalhaHttp, type ContextoBackend } from './seguranca';
/** Caller holds the existing project documentos lease; active jobs must finish first. */
export async function eliminarDocumentoNuvem(sb: SupabaseClient, ctx: ContextoBackend, d: DocumentoNuvem) {
  exigirEscrita(ctx);
  const ativos=await sb.from('hub_jobs').select('id').eq('project_id',ctx.projeto).in('tipo',['documento_preparar','documentos_recolha']).in('estado',['fila','em_curso']).limit(1);
  if(ativos.error||ativos.data?.length)throw new FalhaHttp('Há pesquisas ou PDFs em preparação. Aguarda a conclusão antes de eliminar.',409);
  const prefixo=`${ctx.projeto}/${d.hash}`;
  if(!/^[a-f0-9]{64}$/.test(d.hash)||d.pdf_path!==`${prefixo}/original.pdf`)throw new Error('O caminho privado não corresponde ao documento.');
  // Enumerate every cover revision, not only the currently selected PNG.
  const paths:string[]=[];
  for(let offset=0;;offset+=100){const r=await sb.storage.from('hub-documentos').list(prefixo,{limit:100,offset});if(r.error)throw new Error('Não foi possível conferir os ficheiros privados.');paths.push(...r.data.map(f=>`${prefixo}/${f.name}`));if(r.data.length<100)break;}
  if(paths.length){const r=await sb.storage.from('hub-documentos').remove(paths);if(r.error)throw new Error('Não foi possível eliminar os ficheiros. O registo foi mantido para repetir.');}
  for(let offset=0;;offset+=100){
    const js=await sb.from('hub_jobs').select('*').eq('project_id',ctx.projeto).eq('tipo','documentos_recolha').order('id').range(offset,offset+99);
    if(js.error)throw new Error('Ficheiros removidos; a limpeza dos resultados precisa de nova tentativa.');
    for(const j of js.data??[]){const r=j.resultado;if(!r)continue;const afetados=(r.pdfs??[]).filter((p:{hash:string})=>p.hash===d.hash);if(!afetados.length)continue;
      const resultado={...r,pdfs:r.pdfs.filter((p:{hash:string})=>p.hash!==d.hash),descobertas:(r.descobertas??[]).filter((x:{url:string;origem:string;titulo:string})=>!afetados.some((p:{url:string;candidatoUrl?:string})=>(p.candidatoUrl??p.url)===x.url))};
      const q=await sb.from('hub_jobs').update({resultado,atualizado_em:new Date().toISOString()}).eq('id',j.id).eq('project_id',ctx.projeto).eq('atualizado_em',j.atualizado_em).select('id');
      if(q.error||q.data?.length!==1)throw new FalhaHttp('O resultado mudou. Repete a limpeza para concluir.',409);
    }
    if((js.data??[]).length<100)break;
  }
  const h=await sb.from('hub_recolhas').delete().eq('project_id',ctx.projeto).eq('dados->>documentoId',d.id);if(h.error)throw new Error('O histórico precisa de nova tentativa de limpeza.');
  const r=await sb.from('hub_documentos').delete().eq('id',d.id).eq('project_id',ctx.projeto).eq('revisao',d.revisao).select('id');
  if(r.error||r.data?.length!==1)throw new FalhaHttp('O registo mudou. Atualiza e repete a limpeza para concluir.',409);
  return {ok:true};
}

export async function removerCandidatoNuvem(sb: SupabaseClient, ctx: ContextoBackend, url: string) {
  exigirEscrita(ctx);
  const pesquisas:Record<string,unknown>[]=[];
  for(let offset=0;;offset+=100){const r=await sb.from('hub_jobs').select('*').eq('project_id',ctx.projeto).eq('tipo','documentos_recolha').order('id').range(offset,offset+99);if(r.error)throw new Error('Não foi possível conferir as pesquisas.');pesquisas.push(...r.data);if(r.data.length<100)break;}
  const resultado=(j:Record<string,unknown>)=>j.resultado as import('../../src/features/documentos/contratos').TarefaDocumentos|undefined;
  const afetadas=pesquisas.filter(j=>resultado(j)?.descobertas?.some(d=>d.url===url));
  if(afetadas.some(j=>['fila','em_curso'].includes(String(j.estado))))throw new FalhaHttp('Há uma pesquisa em curso com este resultado.',409);
  const pdfs=afetadas.flatMap(j=>(resultado(j)?.pdfs??[]).filter(p=>(p.candidatoUrl??p.url)===url));
  if(pdfs.some(p=>p.documentoId))throw new Error('Remove primeiro o documento na biblioteca.');
  for(const hash of new Set(pdfs.map(p=>p.hash))){
    if(pesquisas.some(j=>(resultado(j)?.pdfs??[]).some(p=>p.hash===hash&&(!afetadas.includes(j)||(p.candidatoUrl??p.url)!==url))))continue;
    const existe=await sb.from('hub_documentos').select('id').eq('project_id',ctx.projeto).eq('hash',hash).maybeSingle();if(existe.error)throw new Error('Não foi possível confirmar os downloads temporários.');if(existe.data)continue;
    if(!/^[a-f0-9]{64}$/.test(hash))throw new Error('Assinatura de download inválida.');
    const p=`${ctx.projeto}/${hash}/original.pdf`,r=await sb.storage.from('hub-documentos').remove([p]);if(r.error)throw new Error('A limpeza do download precisa de nova tentativa.');
  }
  for(const j of afetadas){const r=resultado(j)!;const novo={...r,descobertas:r.descobertas.filter(d=>d.url!==url),pdfs:(r.pdfs??[]).filter(p=>(p.candidatoUrl??p.url)!==url)};
    const q=await sb.from('hub_jobs').update({resultado:novo,atualizado_em:new Date().toISOString()}).eq('id',j.id).eq('project_id',ctx.projeto).eq('atualizado_em',j.atualizado_em).select('id');if(q.error||q.data?.length!==1)throw new FalhaHttp('A pesquisa mudou. Atualiza e repete a limpeza.',409);j.resultado=novo;
  }
  return {ok:true};
}
