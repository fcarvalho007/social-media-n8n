import { z } from 'zod';
import { chaveRecuperacao, lerRecuperacao } from '@/lib/recuperacaoLocal';
import { prepararTextoCampanha } from './modelo';
export const schemaRascunhoTextoCampanha = z.object({ titulo: z.string().max(300), texto: z.string().max(20000), url: z.string().max(2000) }).strict();
export function reabrirTextoCampanha(userId: string, projeto: string) {
  const r = lerRecuperacao(chaveRecuperacao(userId, 'fonte-campanha', 'texto', projeto), userId);
  const d = schemaRascunhoTextoCampanha.safeParse(r?.dados);
  if (!d.success) throw new Error('O conteúdo colado não está neste navegador. Volta ao passo Fonte para o recuperar ou colar novamente.');
  return prepararTextoCampanha(d.data);
}
