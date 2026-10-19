import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InstagramAnalyticsItem } from '@/hooks/useInstagramAnalytics';
import { filtrarPeriodoSocial, formatoSocial, resumirContasSociais } from '@/lib/analytics/resultadosSociais';
vi.mock('recharts', async importar => ({...await importar<typeof import('recharts')>(), ResponsiveContainer: () => null}));
const h = vi.hoisted(() => ({
  user: {id:'conta-teste',email:'editor@example.test'},
  projeto: {projetoId:'projeto-teste',projeto:{name:'Marca teste'}},
  posts: {analytics:[] as InstagramAnalyticsItem[],stats:{},isLoading:false,isFetching:false,error:null as Error|null,refetch:vi.fn(),deleteAnalytics:vi.fn()},
  perfis: {profiles:[],latestProfiles:[],isLoading:false,isFetching:false,error:null,refetch:vi.fn(),importProfilesAsync:vi.fn(),isImporting:false},
  invoke:vi.fn(),
}));
vi.mock('@/components/analytics/AnimatedNumber',()=>({AnimatedNumber:({value}:{value:number})=><span>{value}</span>,formatCompactNumber:(n:number)=>String(n)}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:h.user})}));
vi.mock('@/contexts/ProjetoContext',()=>({useProjetoOpcional:()=>h.projeto}));
vi.mock('@/hooks/useInstagramAnalytics',()=>({useInstagramAnalytics:()=>h.posts}));
vi.mock('@/hooks/useInstagramProfiles',()=>({useInstagramProfiles:()=>h.perfis}));
vi.mock('@/hooks/useUserRoles',()=>({useCurrentUserRoles:()=>({isAdmin:false,isEditor:true})}));
vi.mock('@/hooks/useAnalyticsBookmarks',()=>({useAnalyticsBookmarks:()=>({isBookmarked:()=>false,toggleBookmark:vi.fn()})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:h.invoke}}}));
import Analytics from '@/pages/Analytics';
import Benchmark from '@/pages/Benchmark';
import Insights from '@/pages/Insights';
import { ContentTypeBreakdown } from '@/components/analytics/ContentTypeBreakdown';
import { KPICards } from '@/components/analytics/KPICards';
import { DataImportHub } from '@/components/analytics/DataImportHub';
const post = (nome:string, gostos:number, comentarios=0):InstagramAnalyticsItem => ({id:nome,user_id:'conta-teste',owner_username:nome,likes_count:gostos,comments_count:comentarios,posted_at:'2026-10-18T10:00:00Z',imported_at:'2026-10-19T10:00:00Z',caption:'Legenda de teste',post_type:'Carrossel',hashtags:[],media_urls:[],post_url:'https://www.instagram.com/p/Teste/',shortcode:'Teste',views_count:0,engagement_rate:0,thumbnail_url:null,location_name:null,is_video:false,video_duration:null,created_at:'2026-10-19T10:00:00Z'});
function abrir(ui:React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>); }
beforeEach(()=>{ h.posts.analytics=[];h.posts.error=null;h.invoke.mockReset();h.perfis.importProfilesAsync.mockReset(); });
afterEach(cleanup);
describe('Estatísticas descritivas sem inventar métricas',()=>{
  it('aplica o mesmo intervalo e exclui datas inválidas/futuras em filtros relativos',()=>{
    const agora=Date.parse('2026-10-19T12:00:00Z');
    const itens=[post('um',1),{...post('outro',2),posted_at:'inválida'},{...post('futuro',3),posted_at:'2027-01-01'}];
    expect(filtrarPeriodoSocial(itens,'30',agora)).toEqual([itens[0]]);
    expect(filtrarPeriodoSocial(itens,'all',agora)).toHaveLength(3);
  });
  it('agrega contas normalizadas sem pontuação composta ou seguidores inferidos',()=>{
    const resumo=resumirContasSociais([post('@Marca',10,2),post('marca',20,4)]);
    expect(resumo).toHaveLength(1);expect(resumo[0]).toMatchObject({username:'marca',quantidade:2,total:36,media:18});
    expect(resumo[0]).not.toHaveProperty('score');expect(resumo[0]).not.toHaveProperty('followers');
    expect(formatoSocial('Sidecar')).toBe(formatoSocial('Carrossel'));
  });
  it('não estima frequência assumindo 30 dias nem apresenta visualizações ausentes como zero',()=>{
    abrir(<KPICards stats={{totalPosts:1,totalLikes:2,totalComments:1,totalViews:0,avgLikes:2,avgComments:1,avgEngagement:3,bestPost:null,worstPost:null,topHashtags:[],contentTypeBreakdown:[{type:'Carrossel',count:1,avgEngagement:3}],engagementOverTime:[]}} />);
    expect(screen.queryByText('Posts/Semana')).not.toBeInTheDocument();
    expect(screen.getByRole('article',{name:'Visualizações registadas: indisponível'})).toHaveTextContent('—');
    expect(screen.getByText('Formatos na amostra')).toBeInTheDocument();
  });
  it('descreve a amostra por formato sem recomendar causalidade ou dividir por zero',()=>{
    abrir(<ContentTypeBreakdown data={[{type:'Sidecar',count:1,avgEngagement:15},{type:'Image',count:1,avgEngagement:0}]} />);
    expect(screen.getByText('Leitura da amostra')).toBeInTheDocument();
    expect(screen.getByText(/15 gostos \+ comentários por publicação, em 1 publicações/)).toBeInTheDocument();
    expect(screen.getByText(/Estes valores não demonstram/)).toBeInTheDocument();
    expect(screen.queryByText('Recomendação')).not.toBeInTheDocument();
    expect(screen.queryByText(/Infinity|Considere aumentar/)).not.toBeInTheDocument();
  });
  it('não cria um ranking nem seguidores zero quando faltam perfis',()=>{
    h.posts.analytics=[post('marca_a',100),post('marca_b',10)];abrir(<Benchmark />);
    fireEvent.click(screen.getByRole('checkbox',{name:'Comparar @marca_a'}));fireEvent.click(screen.getByRole('checkbox',{name:'Comparar @marca_b'}));
    expect(screen.getAllByText('Seguidores: sem perfil importado. Não estimamos este valor.')).toHaveLength(2);
    expect(screen.getByRole('region',{name:'Comparação da amostra'})).toHaveTextContent('100 interações/publicação');
    expect(screen.queryByText('Ranking de Performance')).not.toBeInTheDocument();
  });
  it('mostra o próximo passo quando não existem duas contas',()=>{
    abrir(<Benchmark />);expect(screen.getByRole('link',{name:'Abrir importação do Instagram'})).toHaveAttribute('href','/analytics');
  });
  it('explica a origem e permite importar a um editor cujo email não é o antigo admin',()=>{
    abrir(<Analytics />);
    expect(screen.getAllByRole('button',{name:'Importar Instagram'}).length).toBeGreaterThan(0);
    expect(screen.getByRole('region',{name:'Origem e limites dos dados'})).toHaveTextContent('não usam DataForSEO');
    expect(screen.getByText('Começa por importar as publicações')).toBeInTheDocument();
  });
  it('torna sugestões úteis com dados importados sem fingir IA ou aprendizagem por projeto',()=>{
    h.posts.analytics=[post('marca_a',100)];abrir(<Insights />);
    fireEvent.click(screen.getByRole('combobox',{name:'Período das sugestões'}));
    fireEvent.click(screen.getByRole('option',{name:'Todo o histórico'}));
    expect(screen.getByText('Retoma uma publicação com mais interações registadas')).toBeInTheDocument();
    expect(screen.getByText(/não mostramos essas conclusões dentro de um projeto/)).toBeInTheDocument();
    expect(h.invoke).not.toHaveBeenCalled();
  });
});
describe('Importar ficheiros preservando contexto e falhas',()=>{
  it.each([true,false])('envia o projeto e distingue sucesso de falha (%s)',async sucesso=>{
    h.invoke.mockResolvedValue(sucesso?{data:{success:true,imported:1,duplicates:0},error:null}:{data:null,error:{message:'offline'}});
    abrir(<DataImportHub />);fireEvent.click(screen.getByRole('button',{name:'Importar Instagram'}));
    fireEvent.mouseDown(screen.getByRole('tab',{name:'Publicações JSON'}),{button:0,ctrlKey:false});
    const input=screen.getByRole('tabpanel').querySelector('input[type=file]')!;
    fireEvent.change(input,{target:{files:[new File([JSON.stringify([{ownerUsername:'nova_conta',shortCode:'Teste123',timestamp:'2026-10-18T10:00:00Z',likesCount:1,commentsCount:2}])],'amostra-teste.json',{type:'application/json'})]}});
    fireEvent.click(await screen.findByRole('button',{name:'Importar 1 posts'}));
    await waitFor(()=>expect(h.invoke).toHaveBeenCalledWith('import-instagram-data',{body:{posts:[expect.objectContaining({ownerUsername:'nova_conta'})],project_id:'projeto-teste'}}));
    expect(await screen.findByText(sucesso?'Importação concluída':'Importação por rever')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Voltar aos ficheiros'}));
    expect(screen.getByText('amostra-teste.json')).toBeInTheDocument();
  });
});
