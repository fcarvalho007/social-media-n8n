import {expect,it,vi} from 'vitest';
import {procurarDuplicadosUrl} from '../../supabase/functions/_shared/nl-app/edge-shared/dedup-url';
it('uma falha na consulta de duplicados bloqueia a importação em vez de aparentar ausência',async()=>{
 const selecionar=vi.fn().mockReturnValue({in:vi.fn().mockResolvedValue({data:null,error:{message:'PGRST201'}})});
 await expect(procurarDuplicadosUrl({from:()=>({select:selecionar})},['https://example.org/noticia'])).rejects.toThrow('evitar duplicados');
 expect(selecionar).toHaveBeenCalledWith(expect.stringContaining('edicao:nl_edicoes!edicao_id(numero)'));
});
it('mantém o número da edição e a notícia existente no diagnóstico de duplicado',async()=>{
 const data=[{id:'n',titulo:'Notícia existente',estado:'enviada',url:'https://example.org/noticia',url_norm:'https://example.org/noticia',edicao:{numero:319}}];
 const r=await procurarDuplicadosUrl({from:()=>({select:()=>({in:async()=>({data,error:null})})})},['https://example.org/noticia']);
 expect([...r.values()]).toEqual([expect.objectContaining({id:'n',edicao_numero:319})]);
});
