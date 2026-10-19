import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Campanhas from '@/pages/Campanhas';
import { SITES_INICIAIS } from '@/features/seo/catalogo';
import { criarPecas, prepararDescoberta, type Campanha, type FonteCampanha } from '@/features/campanhas/modelo';
import type { DocumentoAcervo } from '@/features/documentos/modelo';
const m = vi.hoisted(() => ({ api:vi.fn(), fonte:vi.fn(), acervo:vi.fn(), listar:vi.fn(), ler:vi.fn(), campanhas:[] as Campanha[], projeto:'projeto-a' }));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'conta-a'}})}));
vi.mock('@/contexts/ProjetoContext',()=>({useProjeto:()=>({projetoId:m.projeto})}));
vi.mock('@/features/percurso/ProjetoPesquisa',()=>({ProjetoPesquisa:()=>null}));
vi.mock('@/lib/backendHub',()=>({BACKEND_NUVEM:false,MODO_HUB_LOCAL:true}));
vi.mock('@/features/seo/api',()=>({apiSeo:m.api,useSeo:()=>({data:{sites:SITES_INICIAIS,campanhas:m.campanhas,revisoesCampanhas:{}},isLoading:false,atualizar:async()=>{},refetch:vi.fn()})}));
vi.mock('@/features/campanhas/api',()=>({carregarDescoberta:m.fonte}));
vi.mock('@/features/documentos/acervoLocal',()=>({listarAcervo:m.acervo}));
vi.mock('@/services/curadoria',()=>({listarCuradoria:m.listar,lerFonteCuradoria:m.ler,decidirCuradoria:vi.fn(),selecionarNaEdicao:vi.fn(),ocultarNaEdicao:vi.fn(),reporNaEdicao:vi.fn()}));
const texto='Um conteúdo de trabalho sobre processos de marketing e inteligência artificial, com exemplos, contexto e limites a verificar antes de qualquer publicação. '.repeat(3);
const angulo='Ajudar gestores a avaliar onde testar automação com critérios de qualidade e limites de risco.';
function app(url='/campanhas/nova') { return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={[url]}><Routes><Route path="/campanhas/:id" element={<Campanhas/>}/></Routes></MemoryRouter></QueryClientProvider>); }
async function escolherTexto(){fireEvent.click(screen.getByRole('button',{name:/^Colar conteúdo/}));fireEvent.change(screen.getByLabelText('Título do conteúdo'),{target:{value:'IA com critério nas equipas'}});fireEvent.change(screen.getByLabelText('Conteúdo para a campanha'),{target:{value:texto}});fireEvent.click(screen.getByRole('button',{name:'Continuar para a direção'}));await screen.findByRole('heading',{name:'Que direção queres dar a esta fonte?'});}
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();m.campanhas=[];m.projeto='projeto-a';m.acervo.mockResolvedValue([]);m.listar.mockResolvedValue({total:0,itens:[]});vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});m.api.mockImplementation(async(acao,a)=>{if(acao!=='campanha-criar')throw new Error('Ação inesperada');const c:Campanha={...a.plano,id:'11111111-1111-4111-8111-111111111111',versao:1,fonte:a.fonte,fonteConfirmadaEm:null,politicaRevista:1,criadoEm:a.fonte.capturadaEm,alteradoEm:a.fonte.capturadaEm,pecas:criarPecas(a.fonte,a.plano)};m.campanhas.push(c);return c;});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('campanha: sequência completa',()=>{
  it('escolhe notícia dentro da campanha e continua diretamente para a direção',async()=>{
    const f=await prepararDescoberta({tipo:'noticia',id:'n1',titulo:'Uma notícia relevante',texto,url:'https://example.org/noticia',parcial:false,paginas:[]});
    m.listar.mockResolvedValue({total:1,itens:[{id:'n1',titulo:f.titulo,descricao:'Resumo para escolher',criado_em:'2026-10-19',categoria:'IA',origem:'rss',nivel:'artigo',usos:0,edicoes:[]}]});
    m.ler.mockResolvedValue({noticia_id:'n1'});m.fonte.mockResolvedValue(f);app();
    fireEvent.click(screen.getByRole('button',{name:/^Uma notícia/}));fireEvent.click(await screen.findByRole('button',{name:'Usar notícia'}));
    await screen.findByRole('heading',{name:'Que direção queres dar a esta fonte?'});
    expect(m.fonte).toHaveBeenCalledWith({tipo:'noticia',id:'n1',paginas:[]},'conta-a','projeto-a');expect(m.api).not.toHaveBeenCalled();
  });
  it('escolhe PDF e páginas, conserva o projeto e não permite avançar sem texto',async()=>{
    const doc={id:'pdf1',titulo:'Relatório do acervo',origem:'https://example.org/a.pdf',recolhidoEm:'2026-10-19',pdf:{bytes:100,hash:'hash',paginas:[{n:1,texto:'',estado:'sem_texto_com_imagem',paragrafos:[]},{n:2,texto,estado:'texto',paragrafos:[texto]}]}} as DocumentoAcervo;
    m.acervo.mockResolvedValue([doc]);m.fonte.mockResolvedValue(await prepararDescoberta({tipo:'documento',id:'pdf1',titulo:doc.titulo,texto,url:doc.origem,parcial:true,paginas:[2]}));app();
    fireEvent.click(screen.getByRole('button',{name:/^Um estudo ou PDF/}));fireEvent.click(await screen.findByRole('button',{name:'Abrir documento: Relatório do acervo'}));
    expect(screen.getByRole('button',{name:'Usar páginas e continuar'})).toBeDisabled();
    expect(screen.getByRole('checkbox',{name:/Página 1/})).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox',{name:'Página 2'}));fireEvent.click(screen.getByRole('button',{name:'Usar páginas e continuar'}));
    await screen.findByRole('heading',{name:'Que direção queres dar a esta fonte?'});
    expect(m.fonte).toHaveBeenCalledWith({tipo:'documento',id:'pdf1',paginas:[2]},'conta-a','projeto-a');fireEvent.click(screen.getByRole('button',{name:'Voltar à fonte'}));expect(await screen.findByRole('checkbox',{name:'Página 2'})).toBeChecked();
  });
  it('cola conteúdo, confere plano, volta sem perder dados e só cria ao confirmar',async()=>{
    app();await escolherTexto();fireEvent.change(screen.getByLabelText('Site principal da campanha'),{target:{value:'frederico'}});fireEvent.change(screen.getByLabelText('O que vamos acrescentar a esta descoberta?'),{target:{value:angulo}});
    fireEvent.click(screen.getByRole('button',{name:'Ver plano da campanha'}));
    expect(screen.getByRole('region',{name:'Peças a incluir na campanha'})).toBeVisible();expect(m.api).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'Preparar campanha · sem custo'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Ajustar direção'}));expect(screen.getByLabelText('O que vamos acrescentar a esta descoberta?')).toHaveValue(angulo);
    fireEvent.click(screen.getByRole('button',{name:'Ver plano da campanha'}));fireEvent.click(screen.getByRole('checkbox',{name:/Quero preparar/}));fireEvent.click(screen.getByRole('button',{name:'Preparar campanha · sem custo'}));
    await screen.findByRole('heading',{name:'O que falta fazer nesta campanha'});expect(m.api).toHaveBeenCalledOnce();
    expect(m.api).toHaveBeenCalledWith('campanha-criar',expect.objectContaining({fonte:expect.objectContaining({tipo:'texto',texto:texto.trim()}),confirmacao:true}),{projeto:'projeto-a'});
    expect(screen.getByRole('region',{name:'Vista geral da campanha'}).querySelectorAll('ol > li')).toHaveLength(5);
    fireEvent.click(screen.getByRole('heading',{name:'Story',level:4}).closest('li')!.querySelector('button')!);expect(screen.getByRole('region',{name:'Editar Story'})).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Seguinte: Carrossel'}));expect(screen.getByRole('region',{name:'Editar Carrossel'})).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Voltar à vista geral da campanha'}));expect(screen.getByRole('heading',{name:'O que falta fazer nesta campanha'})).toBeVisible();
  });
  it('reabre fonte colada e proposta na mesma conta e projeto, sem misturar outros projetos',async()=>{
    const a=app();await escolherTexto();fireEvent.change(screen.getByLabelText('Site principal da campanha'),{target:{value:'frederico'}});fireEvent.change(screen.getByLabelText('O que vamos acrescentar a esta descoberta?'),{target:{value:angulo}});a.unmount();
    const b=app('/campanhas/nova?conteudo=colado');await screen.findByRole('button',{name:'Recuperar proposta'});fireEvent.click(screen.getByRole('button',{name:'Recuperar proposta'}));expect(screen.getByLabelText('O que vamos acrescentar a esta descoberta?')).toHaveValue(angulo);b.unmount();
    m.projeto='projeto-b';app('/campanhas/nova?conteudo=colado');await screen.findByText(/conteúdo colado não está neste navegador/);expect(screen.getByRole('button',{name:'Escolher outra fonte'})).toBeVisible();
  });
  it('uma falha na leitura da notícia permite repetir ou voltar ao passo Fonte',async()=>{
    m.fonte.mockRejectedValue(new Error('Fonte já indisponível.'));app('/campanhas/nova?noticia=n1');await screen.findByText('Fonte já indisponível.');fireEvent.click(screen.getByRole('button',{name:'Escolher outra fonte'}));expect(screen.getByRole('heading',{name:'De onde parte esta campanha?'})).toBeVisible();expect(m.api).not.toHaveBeenCalled();await screen.findByText('Ainda não há notícias aprovadas neste filtro');
  });
});
