import type { LinhaPreco, OperacaoSeo, PesquisaSeo } from './contratos';
export const PRECOS_SEO_EM = '2026-10-18';
export const PRECO_LABS_URL = 'https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api';
export const PRECO_ADS_URL = 'https://dataforseo.com/pricing/keywords-data/google-ads';
export const PRECO_SERP_URL = 'https://dataforseo.com/pricing/google-serp/google-organic-serp-api';
export const OPERACOES_SEO: Record<OperacaoSeo, { nome: string; ajuda: string; endpoint: string; precoUrl: string; entrada: 'termo' | 'lista' | 'dominio' | 'lacunas' }> = {
  sugestoes: { nome: 'Sugestões de keywords', ajuda: 'Variações que incluem o termo de partida.', endpoint: 'dataforseo_labs/google/keyword_suggestions/live', precoUrl: PRECO_LABS_URL, entrada: 'termo' },
  relacionadas: { nome: 'Keywords relacionadas', ajuda: 'Pesquisas relacionadas com o tema.', endpoint: 'dataforseo_labs/google/related_keywords/live', precoUrl: PRECO_LABS_URL, entrada: 'termo' },
  ideias: { nome: 'Ideias por tema', ajuda: 'Ideias na mesma categoria dos termos indicados.', endpoint: 'dataforseo_labs/google/keyword_ideas/live', precoUrl: PRECO_LABS_URL, entrada: 'lista' },
  visao: { nome: 'Analisar keywords', ajuda: 'Volume, dificuldade e evolução mensal, quando disponíveis.', endpoint: 'dataforseo_labs/google/keyword_overview/live', precoUrl: PRECO_LABS_URL, entrada: 'lista' },
  dominio: { nome: 'Keywords de um domínio', ajuda: 'Consultas em que o domínio já aparece, segundo a base Labs.', endpoint: 'dataforseo_labs/google/ranked_keywords/live', precoUrl: PRECO_LABS_URL, entrada: 'dominio' },
  lacunas: { nome: 'Lacunas face a um concorrente', ajuda: 'Keywords do concorrente ausentes no site escolhido.', endpoint: 'dataforseo_labs/google/domain_intersection/live', precoUrl: PRECO_LABS_URL, entrada: 'lacunas' },
  volume: { nome: 'Volume Google Ads', ajuda: 'Volume e concorrência de anúncios para até 1 000 termos num pedido.', endpoint: 'keywords_data/google_ads/search_volume/live', precoUrl: PRECO_ADS_URL, entrada: 'lista' },
  serp: { nome: 'Resultados do Google', ajuda: 'Resultados atuais e perguntas, para avaliar fontes e formatos de conteúdo.', endpoint: 'serp/google/organic/live/advanced', precoUrl: PRECO_SERP_URL, entrada: 'termo' },
};
export const microUsd = (usd: number) => Math.round(usd * 1_000_000);
export const usd = (micro: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 9 }).format(micro / 1_000_000);
export const euroIndicativo = (micro: number, cambio: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(micro / 1_000_000 * cambio);
export function estimarPesquisa(p: PesquisaSeo): { linhas: LinhaPreco[]; total: number } {
  const linha = (descricao: string, quantidade: number, unitarioMicro: number): LinhaPreco => ({ descricao, quantidade, unitarioMicro, totalMicro: quantidade * unitarioMicro });
  const linhas = p.operacao === 'volume' ? [linha('Google Ads · 1 tarefa Live, até 1 000 keywords', 1, 90000)]
    : p.operacao === 'serp' ? [linha('Google SERP Live · blocos de até 10 resultados', Math.ceil(p.limite / 10), 2000)]
    : [linha('DataForSEO Labs · tarefa Live', 1, 12000), linha('Máximo de itens pedidos', p.operacao === 'visao' ? p.termos.length : p.limite, 120)];
  return { linhas, total: linhas.reduce((a, l) => a + l.totalMicro, 0) };
}
export function totaisPesquisa(pedidos: import('./contratos').PedidoSeo[], mes?: string) {
  const reais = pedidos.filter(p => p.modo === 'real' && (!mes || diaLisboa(p.criadoEm).startsWith(mes)));
  const conhecidos = reais.filter(p => p.custoMicro !== null);
  return { custoMicro: conhecidos.reduce((a, p) => a + p.custoMicro!, 0), reservaMicro: reais.reduce((a, p) => a + p.reservaMicro, 0), euros: conhecidos.reduce((a, p) => a + p.custoMicro! / 1e6 * p.cambio, 0), pedidos: reais.length, desconhecidos: reais.filter(p => p.custoMicro === null).length, cache: pedidos.filter(p => p.cacheDe).length };
}
export const diaLisboa = (d: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
export const dataSeo = (d: string) => new Date(d).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'short' });
