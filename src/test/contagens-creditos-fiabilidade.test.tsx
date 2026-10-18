import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
const h=vi.hoisted(()=>({
 user:'a' as string|null,rows:{stories:[{status:'pending',content_type:null}],posts:[{status:'pending',content_type:'carousel'},{status:'pending',content_type:null}]},
 counts:[] as string[],channels:[] as {filtro:Record<string,string>;callback:()=>void}[][],remove:vi.fn(),falha:false,esperar:false,
 pendentes:[] as {resolve:(v:unknown)=>void;resultado:unknown}[],creditos:[] as {user:string;resolve:(v:unknown)=>void}[],
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:h.user?{id:h.user}:null})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 from:(tabela:'stories'|'posts'|'user_ai_credits')=>{
  const filtros:Record<string,unknown>={};
  const q={select:()=>q,eq:(c:string,v:unknown)=>{filtros[c]=v;return q;},
   maybeSingle:()=>new Promise(resolve=>{h.creditos.push({user:String(filtros.user_id),resolve});}),
   then:(resolve:(v:unknown)=>unknown,reject:(e:unknown)=>unknown)=>{
    h.counts.push(tabela);
    const rows=tabela==='user_ai_credits'?[]:h.rows[tabela];
    const resultado=h.falha?{count:null,error:new Error('offline')}:{count:rows.filter(row=>Object.entries(filtros).every(([k,v])=>row[k as keyof typeof row]===v)).length,error:null};
    return (h.esperar?new Promise(r=>h.pendentes.push({resolve:r,resultado})):Promise.resolve(resultado)).then(resolve,reject);
   },
  };return q;
 },
 channel:()=>{const regs:typeof h.channels[number]=[];h.channels.push(regs);const c={on:(_e:string,filtro:Record<string,string>,callback:()=>void)=>{regs.push({filtro,callback});return c;},subscribe:()=>c};return c;},removeChannel:h.remove,
}}));
import {usePendingCounts} from '@/hooks/usePendingCounts';
import {useAICredits} from '@/hooks/useAICredits';
let client:QueryClient;
function Contagem({nome}:{nome:string}){const q=usePendingCounts();return <output aria-label={nome}>{q.error?'indisponivel':q.loading?'a_carregar':q.counts.total}</output>;}
function Creditos(){const q=useAICredits();return <output aria-label="Créditos">{q.error?'indisponivel':q.loading?'a_carregar':q.credits.credits_remaining}</output>;}
function envolver(children:React.ReactNode){return <QueryClientProvider client={client}>{children}</QueryClientProvider>;}
beforeEach(()=>{h.user='a';h.counts=[];h.channels=[];h.remove.mockClear();h.creditos=[];h.pendentes=[];h.falha=false;h.esperar=false;h.rows={stories:[{status:'pending',content_type:null}],posts:[{status:'pending',content_type:'carousel'},{status:'pending',content_type:null}]};client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});});
afterEach(()=>{cleanup();client.clear();vi.useRealTimers();});
describe('contagens partilhadas e atualizadas',()=>{
 it('lança as três contagens em paralelo e partilha consultas/canal entre menu e página',async()=>{
  h.esperar=true;const app=render(envolver(<><Contagem key="menu" nome="Menu"/><Contagem key="pagina" nome="Página"/></>));
  await waitFor(()=>expect(h.pendentes).toHaveLength(3));
  expect(h.counts).toHaveLength(3);expect(h.channels).toHaveLength(1);
  await act(async()=>{h.pendentes.forEach(p=>p.resolve(p.resultado));});
  await waitFor(()=>expect(screen.getByLabelText('Menu')).toHaveTextContent('3'));
  expect(screen.getByLabelText('Página')).toHaveTextContent('3'); // Includes a legacy post with NULL content_type.
  app.rerender(envolver(<Contagem key="pagina" nome="Página"/>));expect(h.remove).not.toHaveBeenCalled();
  app.unmount();expect(h.remove).toHaveBeenCalledOnce();
 });
 it('aprovar ou eliminar também atualiza; uma rajada de eventos faz só uma nova leitura',async()=>{
  vi.useFakeTimers({shouldAdvanceTime:true});render(envolver(<Contagem nome="Menu"/>));
  await waitFor(()=>expect(screen.getByLabelText('Menu')).toHaveTextContent('3'));
  expect(h.channels[0].every(r=>!('filter' in r.filtro))).toBe(true);
  h.rows.posts[0].status='approved';
  act(()=>{for(let i=0;i<20;i++)h.channels[0][1].callback();vi.advanceTimersByTime(201);});
  await waitFor(()=>expect(screen.getByLabelText('Menu')).toHaveTextContent('2'));
  expect(h.counts).toHaveLength(6);
 });
 it('uma falha numa contagem não se apresenta como zero confirmado',async()=>{
  h.falha=true;render(envolver(<Contagem nome="Menu"/>));
  await waitFor(()=>expect(screen.getByLabelText('Menu')).toHaveTextContent('indisponivel'));
 });
 it('sem sessão não abre consultas nem subscrições',()=>{
  h.user=null;render(envolver(<Contagem nome="Menu"/>));expect(h.counts).toHaveLength(0);expect(h.channels).toHaveLength(0);
 });
});
describe('créditos por conta',()=>{
 it('uma resposta antiga nunca substitui os créditos da nova conta',async()=>{
  const app=render(envolver(<Creditos/>));await waitFor(()=>expect(h.creditos).toHaveLength(1));
  h.user='b';app.rerender(envolver(<Creditos/>));await waitFor(()=>expect(h.creditos).toHaveLength(2));
  expect(screen.getByLabelText('Créditos')).toHaveTextContent('a_carregar');
  await act(async()=>h.creditos[1].resolve({data:{credits_remaining:20,credits_monthly_allowance:30,plan_tier:'pro'},error:null}));
  await waitFor(()=>expect(screen.getByLabelText('Créditos')).toHaveTextContent('20'));
  await act(async()=>h.creditos[0].resolve({data:{credits_remaining:99},error:null}));
  expect(screen.getByLabelText('Créditos')).toHaveTextContent('20');
 });
 it('o mesmo saldo não é consultado duas vezes por dois consumidores',async()=>{
  render(envolver(<><Creditos/><Creditos/></>));await waitFor(()=>expect(h.creditos).toHaveLength(1));
 });
 it('um erro do serviço fica distinto de um saldo de zero',async()=>{
  render(envolver(<Creditos/>));await waitFor(()=>expect(h.creditos).toHaveLength(1));
  await act(async()=>h.creditos[0].resolve({data:null,error:new Error('offline')}));
  await waitFor(()=>expect(screen.getByLabelText('Créditos')).toHaveTextContent('indisponivel'));
 });
});
