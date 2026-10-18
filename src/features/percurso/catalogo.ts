import type { SupabaseClient } from '@supabase/supabase-js';
import type { EstadoSeo } from '../seo/contratos';
import { textoSocial, type CatalogoPesquisa, type ItemPesquisa, type TipoPesquisa } from './pesquisa';

export interface DocumentoPesquisa { id: string; titulo: string; origem?: string | null; fonteNome?: string; recolhidoEm: string; processamento?: { estado: string }; pdf: { paginas: { n: number; texto: string }[] } }
interface Row {
  id: string; titulo?: string; descricao?: string | null; corpo_artigo?: string | null;
  resumo?: string | null; corpo?: string; updated_at?: string; caption?: string | null;
  platform?: string; proposta_id?: string; versao_actual?: number; actualizado_em?: string;
  carrossel?: unknown; divulgacao?: { composicoes?: { story?: unknown; carrossel?: unknown }; story?: unknown };
}
type Consulta = ReturnType<ReturnType<SupabaseClient['from']>['select']>;
const MAX = 500, LOTE = 100;
/** All reads use the authenticated client (RLS), plus explicit project/owner filters. */
export async function carregarCatalogo(banco: SupabaseClient, userId: string, projeto: string, estadoSeo: () => Promise<Pick<EstadoSeo, 'pautas' | 'sites' | 'campanhas'>>, documentos: () => Promise<DocumentoPesquisa[]>): Promise<CatalogoPesquisa> {
  const itens: ItemPesquisa[] = [], avisos: string[] = [];
  const incompletos = new Set<TipoPesquisa>();
  async function linhas(tabela: string, colunas: string, filtro: (q: Consulta) => Consulta, nome: string, tipo: TipoPesquisa): Promise<Row[]> {
    const rows: Row[] = [];
    for (let inicio = 0; inicio <= MAX; inicio += LOTE) {
      const r = await filtro(banco.from(tabela).select(colunas)).order('id').range(inicio, Math.min(inicio + LOTE - 1, MAX));
      if (r.error) throw new Error(`Não foi possível pesquisar ${nome}.`);
      for (const row of r.data ?? []) {
        if (!row || typeof row !== 'object' || typeof (row as { id?: unknown }).id !== 'string') throw new Error(`Registo inválido em ${nome}.`);
        rows.push(row as Row);
      }
      if ((r.data?.length ?? 0) < LOTE) break;
    }
    if (rows.length > MAX) { avisos.push(`${nome}: pesquisa limitada aos primeiros ${MAX} registos. O resultado pode estar incompleto.`); incompletos.add(tipo); }
    return rows.slice(0, MAX);
  }
  const fontes: [string, () => Promise<void>, TipoPesquisa][] = [
    ['PDFs', async () => {
      const docs = await documentos();
      for (const d of docs) itens.push({ id: `pdf:${d.id}`, tipo: 'pdf', titulo: d.titulo, texto: [d.fonteNome, d.origem].filter(Boolean).join(' '), paginas: d.pdf.paginas, atualizadoEm: d.recolhidoEm, contexto: 'Acervo do projeto', url: `/curadoria/documentos?documento=${encodeURIComponent(d.id)}` });
      if (docs.some(d => d.processamento && d.processamento.estado !== 'concluido')) avisos.push('Há PDFs ainda a processar ou com falha de extração. Só o texto já extraído é pesquisável.');
      if (docs.some(d => !d.pdf.paginas.some(p => p.texto.trim()))) avisos.push('Há PDFs sem texto extraído. Encontra-os pelo título; páginas digitalizadas precisam de OCR.');
    }, 'pdf'],
    ['Notícias', async () => {
      const rows = await linhas('nl_noticias', 'id,titulo,descricao,corpo_artigo,updated_at', q => q, 'Notícias', 'noticia');
      for (const r of rows) itens.push({ id: `noticia:${r.id}`, tipo: 'noticia', titulo: r.titulo ?? '', texto: `${r.descricao ?? ''} ${r.corpo_artigo ?? ''}`, atualizadoEm: r.updated_at ?? '', contexto: 'Curadoria partilhada · acesso da conta', url: `/curadoria?noticia=${encodeURIComponent(r.id)}` });
    }, 'noticia'],
    ['Artigos', async () => {
      const [e, rows] = await Promise.all([estadoSeo(), linhas('art_rascunhos', 'id,titulo,resumo,corpo,updated_at', q => q.eq('project_id', projeto).eq('created_by', userId), 'Textos de artigos', 'artigo')]);
      for (const p of e.pautas) itens.push({ id: `pauta:${p.id}`, tipo: 'artigo', titulo: p.texto?.titulo || p.titulo, texto: [p.palavra, p.contributo, p.objetivo, p.texto?.resumo, p.texto?.corpo].filter(Boolean).join(' '), atualizadoEm: p.alteradoEm, contexto: `${e.sites.find(s => s.id === p.siteId)?.dominio ?? p.siteId} · plano editorial`, url: `/artigos/plano?id=${encodeURIComponent(p.id)}&secao=texto` });
      for(const c of e.campanhas??[])for(const p of c.pecas)itens.push({id:`campanha:${c.id}:${p.tipo}`,tipo:p.tipo==='artigo'?'artigo':'social',titulo:`${c.nome} · ${p.titulo}`,texto:[p.papel,p.texto,p.cta,c.angulo].join(' '),atualizadoEm:c.alteradoEm,contexto:`Campanha · ${p.tipo==='newsletter'?'proposta para newsletter':p.tipo} · rascunho`,url:`/campanhas/${encodeURIComponent(c.id)}?peca=${p.tipo}`});
      for (const r of rows) itens.push({ id: `artigo:${r.id}`, tipo: 'artigo', titulo: r.titulo ?? '', texto: `${r.resumo ?? ''} ${r.corpo ?? ''}`, atualizadoEm: r.updated_at ?? '', contexto: 'Texto guardado · projeto atual', url: `/artigos?id=${encodeURIComponent(r.id)}` });
    }, 'artigo'],
    ['Rascunhos sociais', async () => {
      const rows = await linhas('posts_drafts', 'id,caption,platform,updated_at', q => q.eq('project_id', projeto).eq('user_id', userId), 'Rascunhos sociais', 'social');
      for (const r of rows) itens.push({ id: `social:${r.id}`, tipo: 'social', titulo: (r.caption || 'Rascunho social').slice(0, 95), texto: r.caption ?? '', atualizadoEm: r.updated_at ?? '', contexto: `${r.platform} · rascunho`, url: `/drafts?draft=${encodeURIComponent(r.id)}` });
    }, 'social'],
    ['Compositor visual', async () => {
      const docs = await linhas('mc_documentos', 'id,proposta_id,versao_actual,actualizado_em', q => q.eq('project_id', projeto), 'Compositor visual', 'social');
      // Chunk IN filters and keep only each document's current version.
      for (let inicio = 0; inicio < docs.length; inicio += 40) {
        const lote = docs.slice(inicio, inicio + 40);
        const propostas = await banco.from('mc_propostas').select('id,trabalho_id').in('id', [...new Set(lote.map(d => d.proposta_id))]);
        if (propostas.error) throw new Error('Compositor indisponível.');
        const atuais = lote.filter(d => typeof d.versao_actual === 'number' && d.versao_actual > 0 && /^[0-9a-f-]{36}$/i.test(d.id));
        if (!atuais.length) continue;
        const versoes = await banco.from('mc_documentos_versoes').select('documento_id,versao,documento').or(atuais.map(d => `and(documento_id.eq.${d.id},versao.eq.${d.versao_actual})`).join(','));
        if (versoes.error) throw new Error('Versões do compositor indisponíveis.');
        for (const d of atuais) {
          const trabalho = propostas.data?.find(p => p.id === d.proposta_id)?.trabalho_id;
          const v = versoes.data?.find(v => v.documento_id === d.id && v.versao === d.versao_actual);
          if (!trabalho || !v) continue;
          const texto = textoSocial(v.documento);
          itens.push({ id: `visual:${d.id}`, tipo: 'social', titulo: texto.trim().slice(0, 95) || 'Composição visual', texto, atualizadoEm: d.actualizado_em ?? '', contexto: `Compositor · versão ${d.versao_actual}`, url: `/estudio/carrosseis/${encodeURIComponent(trabalho)}` });
        }
      }
    }, 'social'],
    ['Divulgação da newsletter', async () => {
      const rows = await linhas('nl_conteudos_derivados', 'id,project_id,divulgacao,carrossel,actualizado_em', q => q.eq('project_id', projeto), 'Divulgação da newsletter', 'social');
      for (const r of rows) for (const peca of ['story', 'carrossel'] as const) {
        const d = r.divulgacao?.composicoes?.[peca];
        const texto = textoSocial(d ?? (peca === 'story' ? r.divulgacao?.story : r.carrossel));
        if (!texto.trim()) continue;
        itens.push({ id: `newsletter:${r.id}:${peca}`, tipo: 'social', titulo: `${peca === 'story' ? 'Story' : 'Carrossel'} · ${texto.trim().slice(0, 85)}`, texto, atualizadoEm: r.actualizado_em ?? '', contexto: 'Divulgação da newsletter · compositor', url: `/estudio/redes-sociais/${encodeURIComponent(r.id)}?compositor=${peca}&peca=${peca}` });
      }
    }, 'social'],
  ];
  const resultados = await Promise.allSettled(fontes.map(async ([, ler]) => ler()));
  resultados.forEach((r, i) => { if (r.status === 'rejected') { incompletos.add(fontes[i][2]); avisos.push(`${fontes[i][0]} indisponíveis. Atualiza para tentar novamente; os restantes resultados continuam disponíveis.`); } });
  return { itens, avisos, incompletos: [...incompletos], recolhidoEm: new Date().toISOString() };
}
