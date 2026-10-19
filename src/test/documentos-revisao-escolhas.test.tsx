import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {FontesDocumentos} from '@/features/documentos/FontesDocumentos';
import type {FonteDocumento,TarefaDocumentos} from '@/features/documentos/contratos';
const m=vi.hoisted(()=>({api:vi.fn(),bin:vi.fn(),guardar:vi.fn()}));
vi.mock('@/features/documentos/apiLocal',()=>({apiDocumentos:m.api,binarioDocumento:m.bin}));
const fonte:FonteDocumento={id:1,name:'Estudos IA',url:'https://example.org/estudos',alternative_urls:[],group_category:'labs_ia',region:'international',priority:'medium',active:false,tags:[],display_order:1};
const job:TarefaDocumentos={id:'job',ambito:'a',modo:'diagnostico',estado:'concluida',iniciadaEm:'2026-10-19T10:00:00Z',atual:'Concluída',total:1,fontes:[],erros:[],descobertas:[{url:'https://example.org/estudo.pdf',origem:fonte.url,titulo:'Relatório de IA',tipo:'pdf',publicadoEm:null,fonteId:1,nomeFonte:fonte.name,nova:true}],pdfs:[]};
function montar(){return render(<FontesDocumentos ambito="a" ocupado={false} onGuardar={m.guardar} onConcluido={()=>{}} onAbrir={()=>{}} onPrepararArtigo={()=>{}}/>);}
beforeEach(()=>{m.api.mockReset();m.guardar.mockReset().mockResolvedValue({id:'doc',titulo:'Relatório de IA',capaCriada:true});m.bin.mockResolvedValue(new Blob(['%PDF-1.7']));m.api.mockImplementation(async(acao:string)=>acao==='fontes'?[fonte]:acao==='tarefas'?[structuredClone(job)]:acao==='diagnostico'?null:acao==='candidato-descarregar'?{...job.descobertas[0],hash:'a'.repeat(64),bytes:12,estado:'descarregado'}:{ok:true});});
afterEach(cleanup);
it('encontra candidatos sem os importar automaticamente e só descarrega após uma escolha explícita',async()=>{
 montar();await screen.findByText('Relatório de IA');expect(m.guardar).not.toHaveBeenCalled();expect(m.bin).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Importar PDF'}));await waitFor(()=>expect(m.guardar).toHaveBeenCalledTimes(1));
 expect(m.api).toHaveBeenCalledWith('candidato-descarregar',{ambito:'a',id:'job',url:job.descobertas[0].url});
 await waitFor(()=>expect(m.api).toHaveBeenCalledWith('confirmar',expect.objectContaining({documentoId:'doc',capaCriada:true})));
});
it('o botão de pesquisa usa diagnóstico, nunca a antiga recolha que importa tudo',async()=>{
 montar();fireEvent.click(await screen.findByRole('checkbox',{name:'Estudos IA'}));fireEvent.click(screen.getByRole('button',{name:'Procurar PDFs'}));
 await waitFor(()=>expect(m.api).toHaveBeenCalledWith('iniciar',{ambito:'a',ids:[1],modo:'diagnostico'}));expect(m.guardar).not.toHaveBeenCalled();
});
it('permite adicionar fontes com âmbito de projeto e apresenta erros junto do formulário',async()=>{
 montar();fireEvent.click(await screen.findByRole('button',{name:'Adicionar fonte'}));const dialog=screen.getByRole('dialog');
 fireEvent.change(within(dialog).getByLabelText('Nome da fonte'),{target:{value:'Minha fonte'}});fireEvent.change(within(dialog).getByLabelText('Página pública HTTPS'),{target:{value:'http://example.org'}});fireEvent.click(within(dialog).getByRole('button',{name:'Guardar fonte'}));expect(await within(dialog).findByRole('alert')).toHaveTextContent('HTTPS');
 m.api.mockImplementation(async(acao:string)=>acao==='fonte-guardar'?[fonte,{...fonte,id:2,name:'Minha fonte'}]:acao==='tarefas'?[job]:[]);
 fireEvent.change(within(dialog).getByLabelText('Página pública HTTPS'),{target:{value:'https://example.org/guias'}});fireEvent.click(within(dialog).getByRole('button',{name:'Guardar fonte'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(m.api).toHaveBeenCalledWith('fonte-guardar',expect.objectContaining({ambito:'a',fonte:expect.objectContaining({url:'https://example.org/guias'})}));
});
it('ignorar conserva o resultado e eliminar exige uma confirmação própria',async()=>{
 montar();await screen.findByText('Relatório de IA');fireEvent.click(screen.getByRole('button',{name:/^Ignorar$/}));await waitFor(()=>expect(m.api).toHaveBeenCalledWith('candidato-decidir',expect.objectContaining({decisao:'ignorar'})));
 fireEvent.click(screen.getByRole('button',{name:'Eliminar resultado: Relatório de IA'}));expect(m.api.mock.calls.some(([a,b])=>a==='candidato-decidir'&&b.decisao==='remover')).toBe(false);fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Cancelar'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('não atribui ao endereço editado as métricas de uma pesquisa feita no endereço antigo',async()=>{
 m.api.mockImplementation(async(acao:string)=>acao==='fontes'?[{...fonte,url:'https://other.example/novo'}]:acao==='tarefas'?[]:acao==='diagnostico'?{...job,fontes:[{fonteId:1,nome:fonte.name,url:fonte.url,estado:'concluida',pdfs:20,paginas:4,novidades:0,detalhes:[]}]}:null);
 montar();await screen.findByRole('checkbox',{name:'Estudos IA'});expect(screen.getByText('Por consultar')).toBeInTheDocument();expect(screen.queryByText('20 PDFs candidatos')).not.toBeInTheDocument();
});
