import { createHash } from 'node:crypto';
import type { EstadoSeo } from '../../src/features/seo/contratos';
import type { EventoEditorial } from '../../src/features/seo/eventos';
export function emitirEvento(e:EstadoSeo,dados:Omit<EventoEditorial,'id'|'entregas'|'em'>,chave:string,agora=new Date()){
 const id=createHash('sha256').update(chave).digest('hex');if(e.eventos?.some(v=>v.id===id))return;
 const entregas=(e.integracoes?.destinos??[]).filter(d=>d.ativo&&d.eventos.includes(dados.tipo)).map(d=>({destinoId:d.id,estado:'pendente' as const,tentativas:0,repetirEm:null,http:null,erro:null}));
 (e.eventos??=[]).push({...dados,id,em:agora.toISOString(),entregas});
 // Completed history is bounded; unacknowledged deliveries are never discarded.
 const concluidos=e.eventos.filter(v=>v.entregas.every(d=>d.estado==='entregue')).slice(-2000);const manter=new Set(concluidos.map(v=>v.id));e.eventos=e.eventos.filter(v=>manter.has(v.id)||v.entregas.some(d=>d.estado!=='entregue'));
}
export function registarTransicoes(antes:EstadoSeo,depois:EstadoSeo){
 for(const p of depois.pautas){const a=antes.pautas.find(v=>v.id===p.id);const base={siteId:p.siteId,artigoId:p.id,versao:p.versao,titulo:p.texto?.titulo||p.titulo,estado:p.estado,url:null};
  const emitir=(tipo:EventoEditorial['tipo'],chave:string)=>emitirEvento(depois,{...base,tipo},`${p.id}:${p.versao}:${tipo}:${chave}`);
  if(!a)emitir('artigo.criado','criado');else{
   if(a.versao!==p.versao)emitir('artigo.atualizado',String(p.versao));
   if(a.estado!==p.estado)emitir('artigo.estado',p.estado);
   if(p.proposta&&JSON.stringify(a.proposta)!==JSON.stringify(p.proposta))emitir('artigo.proposta',createHash('sha256').update(JSON.stringify(p.proposta)).digest('hex'));
   if(p.aprovacao&&a.aprovacao?.assinatura!==p.aprovacao.assinatura)emitir('artigo.aprovado',p.aprovacao.assinatura);
  }
 }
 for(const g of depois.glossarios??[]){const a=antes.glossarios?.find(v=>v.id===g.id);if(a?.versao!==g.versao)emitirEvento(depois,{tipo:'glossario.atualizado',siteId:g.siteId,artigoId:null,versao:g.versao,titulo:g.nome,estado:'rascunho',url:null},`glossario:${g.id}:${g.versao}`);}
}
