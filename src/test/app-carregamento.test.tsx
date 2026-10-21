import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import type {ReactNode} from 'react';
const h=vi.hoisted(()=>({user:null as null|{id:string},shell:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:h.user,loading:false}),AuthProvider:({children}:{children:ReactNode})=>children}));
vi.mock('@/components/AuthenticatedLayout',()=>{h.shell();return{default:()=> <h1>Área de trabalho</h1>};});
vi.mock('@/pages/publico/EdicoesArquivo',()=>({default:()=> <h1>Arquivo público</h1>}));
vi.mock('@/pages/Auth',()=>({default:()=> <h1>Entrar no Hub</h1>}));
import App from '@/App';
afterEach(()=>{cleanup();window.history.replaceState({},'','/');});
describe('carregamento dos módulos por necessidade',()=>{
 it('ler o arquivo público e abrir a entrada não carrega a área editorial; entrar permite carregá-la',async()=>{
  h.user=null;window.history.replaceState({},'','/edicoes');let app=render(<App/>);
  await screen.findByRole('heading',{name:'Arquivo público'});expect(h.shell).not.toHaveBeenCalled();app.unmount();
  window.history.replaceState({},'','/');app=render(<App/>);
  await screen.findByRole('heading',{name:'Entrar no Hub'});expect(h.shell).not.toHaveBeenCalled();app.unmount();
  h.user={id:'conta-autorizada'};window.history.replaceState({},'','/');render(<App/>);
  await screen.findByRole('heading',{name:'Área de trabalho'});expect(h.shell).toHaveBeenCalledOnce();
 });
});
