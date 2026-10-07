import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { TooltipProvider } from "@/components/ui/tooltip";
import type { PropsWithChildren } from 'react';
const mocks=vi.hoisted(()=>({criar:vi.fn().mockResolvedValue({trabalho_id:'job',reutilizado:false}),nav:vi.fn(),fonte:{noticia_id:'news',hash:'hash',titulo:'Notícia aprovada',texto:'Uma biblioteca abriu uma sala de leitura com quarenta lugares. O espaço funciona de segunda a sábado.',url:null,nivel:'resumo',parcial:false}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'owner'}})}));
vi.mock('@/contexts/ProjetoContext',()=>({useProjeto:()=>({projetoId:'project',projetos:[{id:'project',name:'Marca'}],estado:'pronto'})}));
vi.mock('@/services/motor',()=>({criarTrabalho:mocks.criar,lerLinkFonte:vi.fn(),MODELO_IA_NOME:'DeepSeek'}));
vi.mock('react-router-dom',async importOriginal=>({...await importOriginal<object>(),useNavigate:()=>mocks.nav}));
vi.mock('@/features/motor/LimitesIa',async()=>{const React=await import('react');return{LimitesIa:({onAlterado}:{onAlterado:(o:{maxDia:number;maxTrabalho:number;usadosHoje:number})=>void})=>{React.useEffect(()=>onAlterado({maxDia:10,maxTrabalho:2,usadosHoje:0}),[onAlterado]);return null;}}});
vi.mock('@/features/motor/PerfilAutorPainel',()=>({PerfilAutorPainel:()=>null}));
vi.mock('@/features/motor/PainelIdioma',()=>({PainelIdioma:()=>null}));
vi.mock('@/features/motor/ImagensApoio',()=>({ImagensApoio:()=>null}));
vi.mock('@/features/motor/NovaMarca',()=>({NovaMarca:()=>null}));
vi.mock('@/features/curadoria/CuradoriaNoticias',()=>({CuradoriaNoticias:({selecionar}:{selecionar:(f:unknown)=>void})=><button onClick={()=>selecionar(mocks.fonte)}>Escolher fonte de teste</button>}));
vi.mock('@/features/motor/Estudio',()=>({Quadro:({children}:PropsWithChildren)=><div>{children}</div>,Grupo:({children}:PropsWithChildren)=><div>{children}</div>,BarraAcoes:({inicio,fim}:{inicio:React.ReactNode;fim:React.ReactNode})=><div>{inicio}{fim}</div>,ETAPAS:[]}));
import CarrosselNovo from '@/pages/CarrosselNovo';
beforeEach(()=>{vi.spyOn(window,"scrollTo").mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.clearAllMocks();localStorage.clear();});
describe('criação: fonte de curadoria e formato no pedido',()=>{
 for(const formato of ['carrossel','post','story'])it(`cria ${formato} sem IA só após a escolha explícita`,async()=>{
  render(<MemoryRouter initialEntries={[`/estudio/carrosseis/novo?formato=${formato}&noticia=news&modo=manual`]}><TooltipProvider><CarrosselNovo/></TooltipProvider></MemoryRouter>);
  expect(mocks.criar).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Escolher fonte de teste'}));expect(mocks.criar).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Continuar'}));expect(mocks.criar).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Gerar sem IA'}));
  await waitFor(()=>expect(mocks.criar).toHaveBeenCalledTimes(1));expect(mocks.criar).toHaveBeenCalledWith(expect.objectContaining({project_id:'project',fonte_tipo:'curadoria',noticia_id:'news',noticia_hash:'hash',formato,modo:'estruturacao',texto:mocks.fonte.texto}));
  if(formato!=='carrossel')expect(mocks.criar.mock.calls[0][0].slides).toBe(1);expect(mocks.nav).toHaveBeenCalledWith('/estudio/carrosseis/job');
 });
  it('bloqueia o avanço até escolher uma notícia e substitui a lista pela confirmação',async()=>{
   render(<MemoryRouter initialEntries={['/estudio/carrosseis/novo?formato=carrossel&modo=manual']}><TooltipProvider><CarrosselNovo/></TooltipProvider></MemoryRouter>);
   fireEvent.click(screen.getByRole('radio',{name:'Curadoria'}));expect(screen.getByRole('button',{name:'Continuar'})).toBeDisabled();expect(screen.getByText('Seleciona uma notícia para continuar.')).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Escolher fonte de teste'}));expect(screen.getByText('Notícia selecionada')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Escolher fonte de teste'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Continuar'})).toBeEnabled();
   fireEvent.click(screen.getByRole('button',{name:'Escolher outra notícia'}));expect(screen.getByRole('button',{name:'Escolher fonte de teste'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Continuar'})).toBeDisabled();
  });
 it('uma recusa por alteração de fonte não abre um conteúdo nem repete o pedido',async()=>{
  mocks.criar.mockRejectedValueOnce(new Error('A fonte mudou; escolhe a notícia novamente.'));render(<MemoryRouter initialEntries={['/?formato=post&noticia=news&modo=manual']}><TooltipProvider><CarrosselNovo/></TooltipProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Escolher fonte de teste'}));fireEvent.click(screen.getByRole('button',{name:'Continuar'}));fireEvent.click(screen.getByRole('button',{name:'Gerar sem IA'}));expect(await screen.findByText('A fonte mudou; escolhe a notícia novamente.')).toBeInTheDocument();expect(mocks.criar).toHaveBeenCalledTimes(1);expect(mocks.nav).not.toHaveBeenCalled();
 });
  it('mostra Editorial e PAS e cria ambas sem uma segunda confirmação',async()=>{
   render(<MemoryRouter initialEntries={['/estudio/carrosseis/novo?formato=carrossel&noticia=news&modo=ia']}><TooltipProvider><CarrosselNovo/></TooltipProvider></MemoryRouter>);
   fireEvent.click(screen.getByRole('button',{name:'Escolher fonte de teste'}));fireEvent.click(screen.getByRole('button',{name:'Continuar'}));
   expect(screen.getByText('Editorial')).toBeInTheDocument();expect(screen.getByText('PAS')).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Gerar versões Editorial e PAS com dois pedidos pagos'}));
   await waitFor(()=>expect(mocks.criar).toHaveBeenCalledTimes(1));expect(mocks.criar).toHaveBeenCalledWith(expect.objectContaining({modo:'ia'}));
   expect(screen.queryByText(/Confirmar: 1 pedido/)).not.toBeInTheDocument();
  });
});
