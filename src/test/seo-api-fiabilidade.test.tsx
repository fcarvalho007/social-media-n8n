import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {apiSeo,useSeo} from '@/features/seo/api';
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});
describe('espera e atualizações do motor editorial',()=>{
 it('a redação pode terminar depois dos 25 segundos sem falso erro nem repetição paga',async()=>{
  vi.useFakeTimers();
  vi.spyOn(AbortSignal,'timeout').mockImplementation(ms=>{const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal;});
  const sinais:AbortSignal[]=[];
  const fetchMock=vi.fn((_url:string,options:RequestInit)=>new Promise<Response>((resolve,reject)=>{
    const signal=options.signal!;sinais.push(signal);
    signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
    setTimeout(()=>resolve(new Response(JSON.stringify({estado:'concluido'}))),60_000);
  }));
  vi.stubGlobal('fetch',fetchMock);
  const pedido=apiSeo<{estado:string}>('executar',{id:'orcamento-autorizado',confirmar:true});
  await vi.advanceTimersByTimeAsync(26_000);expect(sinais[0].aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(34_000);expect(await pedido).toEqual({estado:'concluido'});
  expect(fetchMock).toHaveBeenCalledOnce();
 });
 it('mantém o prazo curto nas leituras normais e exige reconciliação antes de repetir',async()=>{
  vi.useFakeTimers();
  vi.stubGlobal('fetch',vi.fn((_u:string,o:RequestInit)=>new Promise((_resolve,reject)=>o.signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))));
  // AbortSignal.timeout uses the platform timer; inspect the requested deadline with a controlled signal.
  const controlo=new AbortController();vi.spyOn(AbortSignal,'timeout').mockReturnValue(controlo.signal);
  const pedido=apiSeo<never>('estado').catch(e=>e as Error);
  expect(AbortSignal.timeout).toHaveBeenCalledWith(25000);controlo.abort();
  expect((await pedido).message).toContain('histórico antes de repetir um pedido pago');
 });
 it('consulta a cada 30s em repouso e acelera para 5s quando há um pedido em curso',async()=>{
  vi.useFakeTimers({shouldAdvanceTime:true});let emCurso=false;
  const fetchMock=vi.fn(async()=>new Response(JSON.stringify({pedidos:emCurso?[{id:'p',estado:'em_curso'}]:[]})));
  vi.stubGlobal('fetch',fetchMock);const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  function Estado(){const q=useSeo();return <output>{q.data?'pronto':'a_carregar'}</output>;}
  const app=render(<QueryClientProvider client={client}><Estado/></QueryClientProvider>);
  await screen.findByText('pronto');expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async()=>vi.advanceTimersByTime(5001));expect(fetchMock).toHaveBeenCalledTimes(1);
  emCurso=true;await act(async()=>vi.advanceTimersByTime(25000));await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
  await act(async()=>vi.advanceTimersByTime(5001));await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(3));
  app.unmount();client.clear();
 });
});
