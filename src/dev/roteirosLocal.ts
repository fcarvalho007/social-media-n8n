import type { ApiRoteiros } from '@/services/roteiros';
import type { API_CURADORIA } from '@/features/curadoria/CuradoriaNoticias';
export async function local<T>(acao: string, args: object = {}): Promise<T> {
 const r = await fetch('/__roteiros_local', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({acao,args}) });
 const j=await r.json(); if(!r.ok || j.error) throw new Error(j.error ?? 'Erro na base local'); return j.data;
}
export const apiRoteirosLocal: ApiRoteiros = {
 listar: project => local('listar',{project}), obter: id=>local('obter',{id}),
 criar:(id,project,fonte,brief)=>local('criar',{id,project,fonte,brief}),
 guardar:(id,revisao,brief,documento)=>local('guardar',{id,revisao,brief,documento}),
 historico:id=>local('historico',{id}),geracoes:id=>local('geracoes',{id}),
 gerar:(id,roteiro,pedido)=>local('gerar',{id,roteiro:{id:roteiro.id,revisao:roteiro.revisao},pedido,confirmar:true}),iaDisponivel:false,
};
export const curadoriaRoteirosLocal: typeof API_CURADORIA = {
 listar: async (f={}) => { const all=await local<Array<{id:string;titulo:string;texto:string;estado:'pendente'|'aprovada'|'rejeitada';criado_em:string}>>('noticias'); const itens=all.filter(n=>n.estado===(f.estado??'aprovada')&&(!f.query||`${n.titulo} ${n.texto}`.toLowerCase().includes(f.query.toLowerCase()))&&(!f.categoria||f.categoria==='media')&&(!f.desde||n.criado_em>=f.desde)); return {total:itens.length,itens:itens.slice((f.pagina??0)*24,((f.pagina??0)+1)*24).map(n=>({id:n.id,titulo:n.titulo,descricao:n.texto,url:null,categoria:'media',origem:'manual',editorial_estado:n.estado,estado_newsletter:'pendente',edicao_id:null,criado_em:n.criado_em,nivel:'artigo',usos:0,edicoes:[],fonte_nome:'Texto inserido na validação local'}))}; },
 ler:id=>local('fonte',{id}),decidir:(id,estado)=>local('decidir',{id,estado}),selecionarEdicao:async()=>{throw new Error('As newsletters não fazem parte deste teste local.');},
};

import type { ApiMateriais,MaterialRoteiro } from '@/services/roteiros-materiais';
import { prepararFicheiro } from '@/features/editor-grafico/carregar';
export const apiMateriaisLocal:ApiMateriais={
 local:true,listar:project=>local('assets_listar',{project}),ler:(project,ids)=>local('assets_ler',{project,ids}),
 escolher:async(project,imagem)=>(await local<Record<string,MaterialRoteiro>>('assets_ler',{project,ids:[imagem.id]}))[imagem.id],
 carregar:async(project,f)=>local('asset_carregar',{project,nome:f.name,dados:await prepararFicheiro(f)}),
};
