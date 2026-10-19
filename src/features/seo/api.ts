import {BACKEND_NUVEM,apiBackend} from '@/lib/backendHub';
import {useProjetoOpcional} from '@/contexts/ProjetoContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { EstadoPublicoSeo } from './contratos';
export async function apiSeo<T>(acao:string,dados:unknown={},opcoes:{projeto?:string}={}):Promise<T>{
  if(BACKEND_NUVEM)return apiBackend<T>(`/seo/${acao}`,{...dados as Record<string,unknown>,...(acao==='executar-ciclo'?{pedidoId:crypto.randomUUID()}:{})},{...opcoes,timeout:(acao==='executar'||acao==='campanha-ideias-executar')?120000:acao.startsWith('inventario-')?90000:25000});
  let r:Response;try{r=await fetch(`/__hub-seo/${acao}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados),signal:AbortSignal.timeout((acao === 'executar'||acao==='campanha-ideias-executar') ? 120000 : acao.startsWith('inventario-') ? 90000 : 25000)});}catch{throw new Error('O servidor local não respondeu. Reabre o Hub e consulta o histórico antes de repetir um pedido pago.');}
  let j:unknown;try{j=await r.json();}catch{throw new Error('A resposta local não é válida. Confirma que npm run dev:hub está ligado.');}
  if(!r.ok)throw new Error((j as {erro?:string})?.erro??'Não foi possível concluir a operação local.');return j as T;
}
export function useSeo(){const qc=useQueryClient(),ctx=useProjetoOpcional();const key=BACKEND_NUVEM?['seo-nuvem-estado',ctx?.projetoId]:['seo-local-estado'];const q=useQuery({queryKey:key,enabled:!BACKEND_NUVEM||!!ctx?.projetoId,queryFn:()=>apiSeo<EstadoPublicoSeo>('estado',{}, {projeto:ctx?.projetoId??undefined}),refetchInterval:q=>q.state.data?.pedidos.some(p=>p.estado==='em_curso')?5000:30000,refetchOnWindowFocus:false,retry:false});return {...q,atualizar:()=>qc.invalidateQueries({queryKey:key})};}
export function exportarSeo(nome:string,conteudo:string,tipo='text/csv;charset=utf-8'){const b=new Blob([conteudo],{type:tipo}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);}
export function csvSeo(linhas:unknown[][]){return '\uFEFF'+linhas.map(l=>l.map(v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(';')).join('\r\n');}
