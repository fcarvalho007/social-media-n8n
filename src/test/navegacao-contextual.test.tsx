import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter,Route,Routes,useLocation,useNavigate} from 'react-router-dom';
import {CuradoriaNavegacao,RedirecionarDocumentos} from '@/components/CuradoriaNavegacao';
import {BreadcrumbsHub} from '@/components/BreadcrumbsHub';
import {migalhasNavegacao} from '@/lib/navegacao';
vi.mock('@/features/documentos/modelo',async()=>({...await vi.importActual('@/features/documentos/modelo'),DOCUMENTOS_LOCAL:true,DOCUMENTOS_DISPONIVEL:true}));
afterEach(cleanup);
function Contexto(){const l=useLocation(),n=useNavigate();return <><output aria-label="Localização">{l.pathname+l.search+l.hash}</output><output aria-label="Estado">{JSON.stringify(l.state)}</output><button onClick={()=>n(-1)}>Voltar no navegador</button><CuradoriaNavegacao/></>;}
describe('percursos da curadoria',()=>{
 it('troca entre notícias e fontes no endereço e respeita o botão voltar',()=>{
  render(<MemoryRouter initialEntries={['/curadoria']}><Contexto/></MemoryRouter>);
  fireEvent.click(screen.getByRole('link',{name:'Fontes de notícias'}));
  expect(screen.getByLabelText('Localização')).toHaveTextContent('/curadoria?separador=fontes');
  expect(screen.getByRole('link',{name:'Fontes de notícias'})).toHaveAttribute('aria-current','page');
  fireEvent.click(screen.getByRole('button',{name:'Voltar no navegador'}));
  expect(screen.getByRole('link',{name:'Notícias'})).toHaveAttribute('aria-current','page');
 });
 it('os PDFs pertencem à curadoria e mantêm o separador ativo dentro do leitor',()=>{
  render(<MemoryRouter initialEntries={['/curadoria/documentos?documento=pdf&separador=fontes']}><Contexto/></MemoryRouter>);
  const nav=screen.getByRole('navigation',{name:'Áreas da curadoria'});
  expect(within(nav).getByRole('link',{name:'Documentos e relatórios'})).toHaveAttribute('aria-current','page');
  expect(within(nav).getByRole('link',{name:'Fontes de notícias'})).not.toHaveAttribute('aria-current');
 });
 it('um favorito antigo conserva projeto, pesquisa, documento, fragmento e estado',()=>{
  render(<MemoryRouter initialEntries={[{pathname:'/documentos',search:'?projeto=p&q=IA&documento=d',hash:'#pagina-2',state:{origem:'artigo'}}]}><Routes><Route path="/documentos" element={<RedirecionarDocumentos/>}/><Route path="/curadoria/documentos" element={<Contexto/>}/></Routes></MemoryRouter>);
  expect(screen.getByLabelText('Localização')).toHaveTextContent('/curadoria/documentos?projeto=p&q=IA&documento=d#pagina-2');
  expect(screen.getByLabelText('Estado')).toHaveTextContent('"origem":"artigo"');
 });
 it('o breadcrumb móvel conserva o regresso à biblioteca com os filtros',()=>{
  render(<MemoryRouter><BreadcrumbsHub compacto migalhas={migalhasNavegacao('/curadoria/documentos','?q=IA&documento=d')}/></MemoryRouter>);
  const nav=screen.getByRole('navigation',{name:'Localização atual'});
  expect(within(nav).getByRole('link',{name:'Documentos e relatórios'})).toHaveAttribute('href','/curadoria/documentos?q=IA');
  expect(within(nav).getByRole('link',{name:'Ler documento'})).toHaveAttribute('aria-current','page');
  expect(within(nav).queryByRole('link',{name:'Início'})).not.toBeInTheDocument();
 });
});

it('conserva os filtros de notícias entre separadores sem levar esses filtros para a biblioteca de PDFs',()=>{
 render(<MemoryRouter initialEntries={['/curadoria?noticias_q=formacao&noticias_estado=aprovada&noticia=n']}><Contexto/></MemoryRouter>);
 fireEvent.click(screen.getByRole('link',{name:'Emails'}));expect(screen.getByLabelText('Localização')).toHaveTextContent('noticias_q=formacao');
 fireEvent.click(screen.getByRole('link',{name:'Notícias'}));expect(screen.getByLabelText('Localização')).toHaveTextContent('noticias_estado=aprovada');expect(screen.getByLabelText('Localização')).not.toHaveTextContent('noticia=n');
 expect(screen.getByRole('link',{name:'Documentos e relatórios'})).toHaveAttribute('href','/curadoria/documentos');
});
