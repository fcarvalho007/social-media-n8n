import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {PublishModal} from '@/components/publishing/PublishModal';
import type {PublishProgress,PublishTarget} from '@/types/publishing';
const h=vi.hoisted(()=>({sucesso:vi.fn(),erro:vi.fn()}));
vi.mock('sonner',()=>({toast:{success:h.sucesso,error:h.erro}}));
const anterior=Object.getOwnPropertyDescriptor(navigator,'clipboard');
afterEach(()=>{cleanup();vi.clearAllMocks();if(anterior)Object.defineProperty(navigator,'clipboard',anterior);else Reflect.deleteProperty(navigator,'clipboard');});
function abrir(writeText:(s:string)=>Promise<void>){Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});const progress:Record<PublishTarget,PublishProgress>={instagram:{platform:'instagram',status:'error',progress:0,error:'Falha de teste',technicalDetails:null},linkedin:{platform:'linkedin',status:'pending',progress:0}};render(<PublishModal open onOpenChange={vi.fn()} targets={{instagram:true,linkedin:false}} postType="carousel" mediaCount={2} progress={progress}/>);}
describe('diagnóstico de publicação sem falso sucesso',()=>{
 it('espera pela confirmação da área de transferência mesmo sem detalhes adicionais',async()=>{
  let concluir:()=>void=()=>{};const write=vi.fn((_texto:string)=>new Promise<void>(resolve=>{concluir=resolve;}));abrir(write);
  fireEvent.click(screen.getByRole('button',{name:'Copiar Detalhes'}));expect(write).toHaveBeenCalledOnce();expect(h.sucesso).not.toHaveBeenCalled();
  expect(JSON.parse(write.mock.calls[0][0] as string)).toMatchObject({platform:'instagram',status:'error'});
  await act(async()=>concluir());expect(h.sucesso).toHaveBeenCalledOnce();
 });
 it('recusa do navegador não aparece como detalhes copiados',async()=>{
  abrir(vi.fn().mockRejectedValue(new Error('permissão recusada')));fireEvent.click(screen.getByRole('button',{name:'Copiar Detalhes'}));
  await waitFor(()=>expect(h.erro).toHaveBeenCalledOnce());expect(h.sucesso).not.toHaveBeenCalled();
 });
});
