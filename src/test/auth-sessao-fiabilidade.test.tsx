import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import type {Session} from '@supabase/supabase-js';
const h=vi.hoisted(()=>({getSession:vi.fn(),evento:null as null|((event:string,session:Session|null)=>void),unsubscribe:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:h.getSession,onAuthStateChange:(cb:typeof h.evento)=>{h.evento=cb;return{data:{subscription:{unsubscribe:h.unsubscribe}}};},signOut:vi.fn(),setSession:vi.fn()},functions:{invoke:vi.fn()}}}));
import {AuthProvider,useAuth,LIMITE_ENTRADA_MS} from '@/contexts/AuthContext';
function Estado(){const a=useAuth();return <output aria-label="Sessão">{a.loading?'a_carregar':a.user?.id??'sem_sessao'}</output>;}
const sessao=(id:string)=>({user:{id}} as Session);
let concluir:(v:{data:{session:Session|null}})=>void;
beforeEach(()=>{vi.clearAllMocks();h.evento=null;h.getSession.mockImplementation(()=>new Promise(resolve=>{concluir=resolve;}));});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('inicialização e alterações da sessão',()=>{
 it('a leitura inicial tardia não substitui uma entrada mais recente',async()=>{
  render(<AuthProvider><Estado/></AuthProvider>);
  act(()=>h.evento?.('SIGNED_IN',sessao('b')));
  expect(screen.getByLabelText('Sessão')).toHaveTextContent('b');
  await act(async()=>concluir({data:{session:sessao('a')}}));
  expect(screen.getByLabelText('Sessão')).toHaveTextContent('b');
 });
 it('a leitura inicial não restaura uma sessão depois da saída',async()=>{
  render(<AuthProvider><Estado/></AuthProvider>);
  act(()=>h.evento?.('SIGNED_OUT',null));
  await act(async()=>concluir({data:{session:sessao('a')}}));
  expect(screen.getByLabelText('Sessão')).toHaveTextContent('sem_sessao');
 });
 it('uma rejeição do serviço termina o carregamento',async()=>{
  h.getSession.mockRejectedValueOnce(new Error('offline'));
  render(<AuthProvider><Estado/></AuthProvider>);
  await waitFor(()=>expect(screen.getByLabelText('Sessão')).toHaveTextContent('sem_sessao'));
 });
 it('uma leitura que nunca responde não deixa a aplicação num spinner permanente',async()=>{
  vi.useFakeTimers();render(<AuthProvider><Estado/></AuthProvider>);
  await act(async()=>{vi.advanceTimersByTime(LIMITE_ENTRADA_MS+1);});
  expect(screen.getByLabelText('Sessão')).toHaveTextContent('sem_sessao');
 });
 it('desmontar liberta a subscrição e o temporizador de uma leitura pendente',async()=>{
  vi.useFakeTimers();const app=render(<AuthProvider><Estado/></AuthProvider>);
  await act(async()=>app.unmount());
  expect(h.unsubscribe).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
 });
});
