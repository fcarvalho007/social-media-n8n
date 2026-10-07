import { promptRefinamento, interpretarRefinamento, type ContextoRefinamento } from './refinar.ts';
import { interpretarResposta, promptRoteiro, type FonteRoteiro, type BriefRoteiro, type DocumentoRoteiro } from './modelo.ts';
import { type ResultadoGateway, MENSAGEM_RECUSA } from '../motor/gateway.server.ts';
export interface ResultadoRoteiro { estado: 'concluida' | 'erro' | 'desconhecido'; resultado: DocumentoRoteiro | null; erro: string | null; entrada: number | null; saida: number | null }
/** Dependency-injected provider; exercised with real source/validation, no fake result fallback. */
export async function gerarRoteiro(fonte: FonteRoteiro, brief: BriefRoteiro, chamar: (sistema: string, utilizador: string) => Promise<ResultadoGateway>, contexto?: ContextoRefinamento | null): Promise<ResultadoRoteiro> {
  const prompt = contexto ? promptRefinamento(fonte, brief, contexto) : promptRoteiro(fonte, brief);
  const base = { resultado: null, entrada: null, saida: null };
  let r: ResultadoGateway;
  try { r = await chamar(prompt.sistema, prompt.utilizador); }
  catch { return { ...base, estado: 'desconhecido', erro: 'Não foi possível confirmar a resposta. O pedido não é repetido automaticamente.' }; }
  if (r.tipo === 'desconhecido') return { ...base, estado: 'desconhecido', erro: 'A resposta da IA ficou incompleta. Não voltámos a cobrar outro pedido automaticamente.' };
  if (r.tipo === 'erro_antes_pedido') return { ...base, estado: 'erro', erro: r.mensagem };
  if (r.tipo === 'recusado') return { ...base, estado: 'erro', erro: MENSAGEM_RECUSA[r.classe] };
  try { return { estado: 'concluida', resultado: contexto ? interpretarRefinamento(r.texto, fonte, contexto) : interpretarResposta(r.texto, fonte, brief), erro: null, entrada: r.tokensEntrada, saida: r.tokensSaida }; }
  catch { return { estado: 'erro', resultado: null, erro: 'A IA devolveu uma proposta inválida ou sem referências verificáveis. O texto editado foi preservado.', entrada: r.tokensEntrada, saida: r.tokensSaida }; }
}
