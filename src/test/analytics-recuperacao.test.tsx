import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const h=vi.hoisted(()=>({
 posts:{analytics:[],stats:{},isLoading:false,isFetching:false,error:null as Error|null,refetch:vi.fn(),importPosts:vi.fn(),deleteAnalytics:vi.fn()},
 profiles:{profiles:[],latestProfiles:[],isLoading:false,isFetching:false,error:null as Error|null,refetch:vi.fn()},
}));
vi.mock('@/hooks/useInstagramAnalytics',()=>({useInstagramAnalytics:()=>h.posts}));
vi.mock('@/hooks/useInstagramProfiles',()=>({useInstagramProfiles:()=>h.profiles}));
vi.mock('@/hooks/useAnalyticsBookmarks',()=>({useAnalyticsBookmarks:()=>({isBookmarked:()=>false,toggleBookmark:vi.fn()})}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:null})}));
import Analytics from '@/pages/Analytics';
import Benchmark from '@/pages/Benchmark';
beforeEach(()=>{
 for(const data of [h.posts,h.profiles]){data.error=null;data.isLoading=false;data.isFetching=false;data.refetch.mockReset();}
});
afterEach(cleanup);
describe.each([['resultados',Analytics],['comparação',Benchmark]] as const)('%s: indisponibilidade de dados',(_,Pagina)=>{
 it.each(['posts','profiles'] as const)('distingue uma falha em %s de zero resultados e repete ambas as leituras',(origem)=>{
  h[origem].error=new Error('offline');
  render(<MemoryRouter><Pagina/></MemoryRouter>);
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os resultados');
  expect(screen.queryByText('Sem dados de perfis')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
  expect(h.posts.refetch).toHaveBeenCalledOnce();expect(h.profiles.refetch).toHaveBeenCalledOnce();
 });
 it('aguarda os perfis antes de apresentar números',()=>{
  h.profiles.isLoading=true;render(<MemoryRouter><Pagina/></MemoryRouter>);
  expect(screen.getByRole('status',{name:'A carregar resultados'})).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 });
 it('impede cliques repetidos durante a recuperação',()=>{
  h.posts.error=new Error('offline');h.posts.isFetching=true;
  render(<MemoryRouter><Pagina/></MemoryRouter>);
  expect(screen.getByRole('button',{name:'A atualizar…'})).toBeDisabled();
 });
});
