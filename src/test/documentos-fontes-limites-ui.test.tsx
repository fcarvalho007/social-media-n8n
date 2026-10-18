import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {FontesDocumentos} from '@/features/documentos/FontesDocumentos';
const m=vi.hoisted(()=>({api:vi.fn(async(acao:string)=>acao==='fontes'?Array.from({length:15},(_,i)=>({id:i+1,name:`Fonte ${i+1}`,url:`https://example.org/${i}`,group_category:'labs_ia'})):acao==='diagnostico'?null:[])}));
vi.mock('@/features/documentos/apiLocal',()=>({apiDocumentos:m.api,binarioDocumento:vi.fn()}));
afterEach(()=>{cleanup();m.api.mockClear();});
it('limita o lote a 12 fontes sem perder a seleção ao mudar de página e sem executar recolhas',async()=>{
 render(<FontesDocumentos ambito='["u","p"]' ocupado={false} onGuardar={vi.fn()} onConcluido={()=>{}} onAbrir={()=>{}} onPrepararArtigo={()=>{}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Selecionar até 12 fontes'}));expect(screen.getByText('15 fontes · 12 selecionadas')).toBeInTheDocument();
 fireEvent.click(within(screen.getByRole('navigation',{name:'Páginas de fontes'})).getByRole('button',{name:/seguinte/}));
 expect(screen.getByRole('checkbox',{name:/Fonte 13/})).toBeDisabled();expect(screen.getByRole('button',{name:'Selecionar até 12 fontes'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Limpar seleção'}));expect(screen.getByRole('checkbox',{name:/Fonte 13/})).toBeEnabled();
 expect(m.api.mock.calls.some(([acao])=>acao==='iniciar')).toBe(false);
});
