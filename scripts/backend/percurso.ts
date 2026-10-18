import type { ContextoBackend } from './seguranca';
import type { EstadoSeo } from '../../src/features/seo/contratos';
import { estadoInicialSeo } from '../../src/features/seo/catalogo';
import { carregarCatalogo, type DocumentoPesquisa } from '../../src/features/percurso/catalogo';
import { construirPercursos, type EnvioEditorial, type TrabalhoEditorial } from '../../src/features/percurso/modelo';
import { pesquisarCatalogo, TIPOS_PESQUISA } from '../../src/features/percurso/pesquisa';
import { assinaturaPauta } from '../seo/editorial';
import { z } from 'zod';
export async function estadoEditorialLeitura(ctx: ContextoBackend): Promise<EstadoSeo> {
  const r = await ctx.user.from('hub_editorial_estados').select('dados').eq('project_id', ctx.projeto).maybeSingle();
  if (r.error) throw new Error('Não foi possível consultar o estado editorial.');
  return r.data?.dados ?? estadoInicialSeo();
}
export function projetarEstado(e: Pick<EstadoSeo, 'pautas' | 'sites' | 'pedidos'>, envios: EnvioEditorial[] = [], disponivel = false, local = false, trabalhos: TrabalhoEditorial[] = []) {
  const aprovadas = new Set(e.pautas.filter(p => { const s = e.sites.find(s => s.id === p.siteId); return s && p.aprovacao?.versao === p.versao && p.aprovacao.assinatura === assinaturaPauta(p, s); }).map(p => p.id));
  return construirPercursos(e, envios, aprovadas, disponivel, local, trabalhos);
}
export async function consultarPercurso(ctx: ContextoBackend) {
  const [e, r, j] = await Promise.all([estadoEditorialLeitura(ctx), ctx.user.from('hub_publicacoes').select('id,pauta_id,site_id,versao,destino,estado,remoto_url,atualizado_em').eq('project_id', ctx.projeto).order('atualizado_em', { ascending: false }).limit(1000), ctx.user.from('hub_jobs').select('id,estado,pedido,resultado').eq('project_id', ctx.projeto).eq('tipo', 'wordpress').order('criado_em', { ascending: false }).limit(1000)]);
  const dados = projetarEstado(e, (r.data ?? []) as EnvioEditorial[], !r.error && !j.error, false, (j.data ?? []) as TrabalhoEditorial[]);
  if (r.error || j.error) dados.avisos.push('O histórico de publicação não pôde ser consultado. Não repitas envios sem confirmar o histórico.');
  if (r.data?.length === 1000) dados.avisos.push('O histórico está limitado aos 1 000 envios mais recentes.');
  return dados;
}
export async function pesquisarHub(ctx: ContextoBackend, a: Record<string, unknown>) {
  const p = z.object({ consulta: z.string().trim().min(2).max(160), tipo: z.enum(['todos', ...TIPOS_PESQUISA]).default('todos'), pagina: z.number().int().min(1).max(500).default(1) }).strict().parse(a);
  const catalogo = await carregarCatalogo(ctx.user, ctx.userId, ctx.projeto, () => estadoEditorialLeitura(ctx), async () => {
    const docs: DocumentoPesquisa[] = [];
    for (let inicio = 0; inicio <= 100; inicio += 20) {
      const r = await ctx.user.from('hub_documentos').select('id,dados').eq('project_id', ctx.projeto).order('id').range(inicio, inicio + 19);
      if (r.error) throw new Error('Acervo indisponível.');
      docs.push(...(r.data ?? []).map(r => ({ ...r.dados, id: r.id })));
      if ((r.data?.length ?? 0) < 20) break;
    }
    if (docs.length > 100) throw new Error('O acervo excede o limite desta versão de pesquisa.');
    return docs;
  });
  return pesquisarCatalogo(catalogo, p.consulta, p.tipo, p.pagina);
}
