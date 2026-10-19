import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SeoArtigo } from '@/features/seo/SeoArtigo';
import { ImagemArtigoEditor, PreviaImagemArtigo } from '@/features/seo/ImagemArtigoEditor';
import { EditorVisualArtigo } from '@/features/seo/EditorVisualArtigo';
import { SITES_INICIAIS } from '@/features/seo/catalogo';
import type { TextoEditorial } from '@/features/seo/contratos';
const {pedido}=vi.hoisted(()=>({pedido:vi.fn()}));
vi.mock('@/features/seo/api',()=>({apiSeo:pedido,exportarSeo:vi.fn()}));
vi.mock('@/contexts/ProjetoContext',()=>({useProjetoOpcional:()=>({projetoId:'projeto-teste'})}));
beforeEach(()=>{vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});pedido.mockReset();});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const texto:TextoEditorial={titulo:'SMS para empresas',slug:'sms-empresas',resumo:'Resumo editorial a confirmar antes da publicação.',corpo:'## Primeiro conceito {#primeiro}\n\nVer [o conceito](#primeiro).',afirmacoes:[],alertas:[],seo:{titulo:'SMS: guia para empresas',descricao:'Uma descrição de pesquisa editável, sem inventar métricas.',schema:'Article'}};
function moldura(ui:React.ReactElement){const c=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});return render(<MemoryRouter><QueryClientProvider client={c}>{ui}</QueryClientProvider></MemoryRouter>);}
describe('imagem e metadados no editor existente',()=>{
 it('o título SEO é independente do título editorial e fica editável',()=>{const alterar=vi.fn();moldura(<SeoArtigo texto={texto} palavra="sms marketing" site={SITES_INICIAIS[0]} alterar={alterar}/>);fireEvent.change(screen.getByLabelText('Título para pesquisa'),{target:{value:'Novo título SEO'}});expect(alterar).toHaveBeenLastCalledWith({seo:{...texto.seo,titulo:'Novo título SEO'}});expect(screen.getByLabelText(/Aplicar estes metadados/)).not.toBeChecked();});
 it('reutiliza uma imagem privada sem gerar nem enviar pedidos pagos',async()=>{const id=crypto.randomUUID();pedido.mockImplementation(async acao=>acao==='imagens-listar'?[{id,nome:'capa.png',url:'https://storage.example/capa.png',bytes:2500,tipo:'image/png'}]:null);const alterar=vi.fn();moldura(<ImagemArtigoEditor texto={texto} palavra="sms marketing" site={SITES_INICIAIS[0]} alterar={alterar}/>);fireEvent.click(screen.getByRole('button',{name:'Escolher imagem'}));await screen.findByRole('button',{name:/capa.png/});fireEvent.click(screen.getByRole('button',{name:/capa.png/}));expect(alterar).toHaveBeenCalledWith(expect.objectContaining({id,titulo:texto.titulo}));expect(pedido.mock.calls.every(c=>c[0]==='imagens-listar')).toBe(true);});
 it('uma capa antiga abre por id, sem depender das primeiras 200 imagens da galeria',async()=>{const id=crypto.randomUUID();pedido.mockResolvedValue({id,url:'https://storage.example/privada.png'});moldura(<PreviaImagemArtigo imagem={{id,url:'',titulo:'Capa',alt:'Uma capa descrita',legenda:'Legenda editorial',credito:'Crédito confirmado'}}/>);await waitFor(()=>expect(screen.getByRole('img',{name:'Uma capa descrita'})).toHaveAttribute('src','https://storage.example/privada.png'));expect(pedido).toHaveBeenCalledWith('imagem-detalhe',{id});expect(screen.getByText('Legenda editorial')).toBeVisible();});
 it('preserva os identificadores e ligações dos conceitos ao editar visualmente',()=>{const alterar=vi.fn();moldura(<EditorVisualArtigo valor={texto.corpo} onChange={alterar}/>);expect(screen.getByRole('heading',{name:'Primeiro conceito'})).toHaveAttribute('id','primeiro');expect(screen.getByRole('link',{name:'o conceito'})).toHaveAttribute('href','#primeiro');expect(alterar).not.toHaveBeenCalled();});
});
