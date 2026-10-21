import {BACKEND_NUVEM,pedidoBackend} from '@/lib/backendHub';
import {projetoAcervo} from './acervoNuvem';
import { DOCUMENTOS_LOCAL } from './modelo';

export async function mensagemFalha(res: Response): Promise<string> {
  try { const e = await res.json(); if (typeof e.erro === 'string' && e.erro) return e.erro; } catch { /* A proxy/Vite HTML page is not a useful error for the user. */ }
  return res.status === 403 ? 'O servidor local recusou o pedido. Reabre o Hub no endereço 127.0.0.1:5183.' : 'O servidor local não conseguiu concluir o pedido. Verifica se está ligado e tenta novamente.';
}
export async function pedidoLocal(acao: string, args: Record<string, unknown> = {}): Promise<Response> {
  if(BACKEND_NUVEM)return pedidoBackend(`/documentos/${acao}`,{...args,...(['iniciar','retomar'].includes(acao)?{pedidoId:crypto.randomUUID()}:{})},{projeto:typeof args.ambito==='string'?projetoAcervo(args.ambito):undefined});
  if (!DOCUMENTOS_LOCAL) throw new Error('Disponível apenas no servidor local.');
  let res: Response;
  try { res = await fetch(`/__hub-documentos/${acao}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(45000) }); }
  catch { throw new Error('Não foi possível contactar o servidor local. Confirma que está ligado e tenta novamente.'); }
  if (!res.ok) throw new Error(await mensagemFalha(res));
  return res;
}
export async function apiDocumentos<T>(acao: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await pedidoLocal(acao, args);
  try { return await res.json(); } catch { throw new Error('A resposta do servidor local está incompleta. Tenta atualizar os resultados.'); }
}
export async function binarioDocumento(args: { id: string; ambito: string; hash: string }): Promise<Blob> { return (await pedidoLocal('pdf', args)).blob(); }
