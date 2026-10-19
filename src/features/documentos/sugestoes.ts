import verificacoes from './verificacoes-fontes.json';
/** Editorial selection; counts and accessibility always come from an actual crawl. */
export const SUGESTOES_FONTES = [
  { name: 'Stanford HAI · AI Index', url: 'https://hai.stanford.edu/ai-index', group_category: 'labs_ia', descricao: 'Relatórios e dados sobre adoção, economia e impacto da IA. Para a formação e a sua análise pessoal.', temas: 'IA · fredericocarvalho.pt' },
  { name: 'Microsoft Work Trend Index', url: 'https://www.microsoft.com/worklab', group_category: 'economia_digital', descricao: 'Investigação sobre trabalho, produtividade e adoção de IA nas organizações.', temas: 'Gestão · digitalfc.pt' },
  { name: 'LinkedIn Economic Graph', url: 'https://economicgraph.linkedin.com/research', group_category: 'economia_digital', descricao: 'Estudos sobre competências, emprego e transformação do mercado de trabalho.', temas: 'Emprego · teletrabalhoweb.com' },
  { name: 'APAN · Estudos', url: 'https://apan.pt/conhecimento/estudosquestionarios/', group_category: 'marketing_digital', descricao: 'Investigação de anunciantes e comunicação para contextualizar decisões de marketing em Portugal.', temas: 'Marketing · SMS e comunicação' },
  { name: 'IAPMEI', url: 'https://www.iapmei.pt/', group_category: 'economia_digital', descricao: 'Guias e estudos de apoio às PME, inovação e gestão. Úteis para conteúdos orientados a empresas.', temas: 'Empresas · digitalfc.pt' },
  { name: 'Fundação Francisco Manuel dos Santos', url: 'https://ffms.pt/pt-pt/estudos', group_category: 'estatisticas_oficiais', descricao: 'Estudos com contexto português sobre economia, sociedade e competências.', temas: 'Portugal · formação' },
  { name: 'Eurofound · Teletrabalho', url: 'https://www.eurofound.europa.eu/en/topics/teleworking', group_category: 'organizacoes_internacionais', descricao: 'Relatórios sobre trabalho híbrido, gestão e competências. A disponibilidade automática é confirmada pelo Hub.', temas: 'Teletrabalho · emprego' },
  { name: 'GSMA · Mobile Economy', url: 'https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-economy/', group_category: 'economia_digital', descricao: 'Relatórios do setor móvel para contextualizar comunicação e serviços digitais. Não substituem estudos específicos de SMS marketing.', temas: 'Mobile · smsonline.pt' },
];
export function chaveFonte(url: string) { try { const u = new URL(url); return `${u.hostname.replace(/^www\./,'')}${u.pathname.replace(/\/$/,'')}${u.search}`; } catch { return url; } }

export function verificacaoFonte(url: string) { return verificacoes.find(v=>chaveFonte(v.url)===chaveFonte(url)); }
