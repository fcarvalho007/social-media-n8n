import type {TarefaDocumentos} from '@/features/documentos/contratos';
import type {DocumentoNuvem} from '../../scripts/backend/documentos';
// @vitest-environment node
import {it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
vi.mock('../../scripts/documentos/obter',async()=>({...await vi.importActual('../../scripts/documentos/obter'),obterPublico:vi.fn(async(url:string)=>({url,status:200,tipo:'application/pdf',bytes:Buffer.from('%PDF-1.7\noriginal escolhido')}))}));
vi.mock('../../scripts/documentos/robots',()=>({Robots:class{async verificar(){}}}));
import {DocumentosNuvem} from '../../scripts/backend/documentos';
import {supabaseMemoria} from './apoio/supabase-memoria';
import {operarFontes} from '../../scripts/backend/fontes-documentos';
function base(){const projeto=crypto.randomUUID(),userId=crypto.randomUUID(),id=crypto.randomUUID(),item={url:'https://fonte.example/relatorio.pdf',origem:'https://fonte.example/estudos',titulo:'Estudo escolhido',tipo:'pdf',publicadoEm:null,fonteId:1,nomeFonte:'Fonte',nova:true};const m=supabaseMemoria({hub_jobs:[{id,project_id:projeto,tipo:'documentos_recolha',estado:'concluido',atualizado_em:'2026-10-19T10:00:00Z',criado_em:'2026-10-19T10:00:00Z',pedido:{ids:[1],modo:'diagnostico'},resultado:{fontes:[],descobertas:[item],pdfs:[]}}]});const ctx={projeto,userId,escrever:true,user:m.sb};const docs=new DocumentosNuvem(m.sb,'/tmp',async(bytes,nome)=>({pdf:{hash:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,ficheiro:nome,paginas:[]},capa:null}));return{m,ctx,docs,id,item};}
it('fontes persistem por projeto, com escrita recusada para leitores',async()=>{
 const {m,ctx}=base();const f={name:'Nova fonte',url:'https://source.example/estudos',group_category:'labs_ia'};
 const fs=await operarFontes(m.sb,ctx,'fonte-guardar',{fonte:f});expect(fs.some(x=>x.name===f.name)).toBe(true);
 expect((await operarFontes(m.sb,{...ctx,projeto:crypto.randomUUID()},'fontes',{})).some(x=>x.name===f.name)).toBe(false);
 await expect(operarFontes(m.sb,{...ctx,escrever:false},'fonte-guardar',{fonte:f})).rejects.toThrow('edição');
 const nova=fs.find(x=>x.name===f.name)!;await operarFontes(m.sb,ctx,'fonte-guardar',{fonte:{...f,id:nova.id,pausada:true}});expect((await operarFontes(m.sb,ctx,'fontes',{})).find(x=>x.id===nova.id)?.pausada).toBe(true);
});
it('importa só o PDF da pesquisa autorizada e reusa o registo em vez de duplicar',async()=>{
 const {m,ctx,docs,id,item}=base();await docs.operar(ctx,'candidato-importar',{id,url:item.url});expect(m.tabelas.hub_documentos).toHaveLength(1);expect(m.objetos.size).toBe(1);await docs.operar(ctx,'candidato-importar',{id,url:item.url});expect(m.tabelas.hub_documentos).toHaveLength(1);
 await expect(docs.operar({...ctx,projeto:crypto.randomUUID()},'candidato-importar',{id,url:item.url})).rejects.toThrow('projeto');
});
it('ignorar e repor persistem; pesquisas ativas não podem ser alteradas',async()=>{
 const {m,ctx,docs,id,item}=base();await docs.operar(ctx,'candidato-decidir',{id,url:item.url,decisao:'ignorar'});expect((m.tabelas.hub_jobs[0].resultado as TarefaDocumentos).descobertas[0].decisao).toBe('ignorado');await docs.operar(ctx,'candidato-decidir',{id,url:item.url,decisao:'repor'});expect((m.tabelas.hub_jobs[0].resultado as TarefaDocumentos).descobertas[0].decisao).toBeUndefined();m.tabelas.hub_jobs[0].estado='em_curso';await expect(docs.operar(ctx,'candidato-decidir',{id,url:item.url,decisao:'remover'})).rejects.toThrow('termine');
});
it('elimina original, todas as capas, texto e histórico apenas no projeto autorizado',async()=>{
 const {m,ctx,docs,id,item}=base();await docs.operar(ctx,'candidato-importar',{id,url:item.url});const d=m.tabelas.hub_documentos[0] as unknown as DocumentoNuvem;const prefixo=`${ctx.projeto}/${d.hash}`;m.objetos.set(`${prefixo}/capa-antiga.png`,new Blob());m.objetos.set(`${prefixo}/capa-nova.png`,new Blob());m.objetos.set('outro-projeto/documento.pdf',new Blob());m.tabelas.hub_recolhas=[{id:crypto.randomUUID(),project_id:ctx.projeto,dados:{documentoId:d.id}},{id:crypto.randomUUID(),project_id:'outro',dados:{documentoId:d.id}}];
 await expect(docs.operar(ctx,'documento-eliminar',{id:d.id})).rejects.toThrow('Confirma');await expect(docs.operar({...ctx,projeto:crypto.randomUUID()},'documento-eliminar',{id:d.id,confirmar:true})).rejects.toThrow('projeto');
 await docs.operar(ctx,'documento-eliminar',{id:d.id,confirmar:true});expect(m.tabelas.hub_documentos).toHaveLength(0);expect([...m.objetos.keys()]).toEqual(['outro-projeto/documento.pdf']);expect(m.tabelas.hub_recolhas).toHaveLength(1);expect((m.tabelas.hub_jobs[0].resultado as TarefaDocumentos).pdfs).toHaveLength(0);
});
it('não elimina documentos enquanto há processamento ou pesquisa em curso',async()=>{
 const {m,ctx,docs,id,item}=base();await docs.operar(ctx,'candidato-importar',{id,url:item.url});m.tabelas.hub_jobs.push({id:crypto.randomUUID(),project_id:ctx.projeto,tipo:'documento_preparar',estado:'fila'});await expect(docs.operar(ctx,'documento-eliminar',{id:m.tabelas.hub_documentos[0].id,confirmar:true})).rejects.toThrow('preparação');expect(m.objetos.size).toBe(1);
});
