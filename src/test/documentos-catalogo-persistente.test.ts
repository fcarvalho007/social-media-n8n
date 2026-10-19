// @vitest-environment node
import {it,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {CatalogoFontesLocal,fontesCatalogo,modificarFonte} from '../../scripts/documentos/catalogo';
it('guarda fontes no servidor, reabre e isola os projetos; pausa ou remove sem apagar o acervo',async()=>{
 const pasta=await mkdtemp(path.join(os.tmpdir(),'hub-fontes-'));
 try{const c=new CatalogoFontesLocal(pasta);const fs=await c.alterar('a',x=>modificarFonte(x,{name:'Minha fonte',url:'https://example.org/relatorios',group_category:'labs_ia'}));const f=fs.find(f=>f.name==='Minha fonte')!;expect((await new CatalogoFontesLocal(pasta).listar('a')).find(x=>x.id===f.id)?.url).toBe(f.url);expect((await c.listar('b')).some(x=>x.name==='Minha fonte')).toBe(false);
 await c.alterar('a',x=>modificarFonte(x,{...f,pausada:true}));expect((await c.listar('a')).find(x=>x.id===f.id)?.pausada).toBe(true);
 await c.alterar('a',x=>({...x,alteradas:x.alteradas.filter(x=>x.id!==f.id),removidas:[...x.removidas,f.id]}));expect((await c.listar('a')).some(x=>x.id===f.id)).toBe(false);
 }finally{await rm(pasta,{recursive:true,force:true});}
});
it('recusa credenciais, redes privadas literais, protocolos perigosos e endereços duplicados',()=>{
 const vazio={alteradas:[],removidas:[]};for(const url of ['http://example.org','https://127.0.0.1/private','https://user:secret@example.org','https://host.local'])expect(()=>modificarFonte(vazio,{name:'Teste',url,group_category:'labs_ia'})).toThrow();
 const f=fontesCatalogo()[0];expect(()=>modificarFonte(vazio,{name:'Duplicada',url:f.url,group_category:'labs_ia'})).toThrow('já existe');
});
it('mantém visíveis as evidências, pausa falhas e não trata zero PDFs como prova de impossibilidade',()=>{
 const fs=fontesCatalogo();expect(fs.find(f=>f.id===104)?.pausada).toBe(true);expect(fs.find(f=>f.id===82)?.pausada).toBe(true);expect(fs.find(f=>f.name==='Semrush')?.pausada).toBe(false);
});
