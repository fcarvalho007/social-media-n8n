import type { PalavraSeo, PautaEditorial, SiteEditorial } from './contratos';
import { normalizarSeo } from './politicas';

const termos = (s: string) => new Set(normalizarSeo(s).split(/[^a-z0-9]+/).filter(t => (t.length > 3 || ['ia', 'seo', 'sms'].includes(t)) && !['para', 'como', 'mais', 'sobre', 'pela', 'pelo', 'guia', 'artigo', 'conteudo'].includes(t)));
export interface OportunidadeEditorial {
  adequacao: 'alinhada' | 'confirmar' | 'excluida';
  prioridade: 'alta' | 'media' | 'rever';
  destino: 'criar' | 'atualizar' | 'pauta_existente';
  razoes: string[];
  lacunas: string[];
  urlExistente?: string;
  pautaId?: string;
}
/** Editorial triage, not a ranking prediction. Missing metrics never become zero. */
export function avaliarOportunidade(p: PalavraSeo, site: SiteEditorial, pautas: PautaEditorial[] = []): OportunidadeEditorial {
  const q = normalizarSeo(p.palavra), tokens = termos(q);
  const temas = site.politica.temasPermitidos.filter(t => [...termos(t)].some(x => tokens.has(x)));
  const proibido = site.politica.temasExcluidos.find(t => q.includes(normalizarSeo(t)));
  const propria = site.conhecimento?.paginas.find(x => x.aprovada && x.keyword.trim() && normalizarSeo(x.keyword) === q);
  const pauta = pautas.find(x => x.siteId === site.id && normalizarSeo(x.palavra) === q);
  const razoes: string[] = [], lacunas: string[] = [];
  if (proibido) razoes.push(`Coincide com um tema excluído: ${proibido}.`);
  else if (temas.length) razoes.push(`Relaciona-se com os temas do site: ${temas.slice(0, 3).join(', ')}.`);
  else razoes.push('A relação com os temas autorizados precisa de confirmação editorial.');
  if (p.volume === null) lacunas.push('Volume indisponível');
  else if (p.volume > 0) razoes.push(`Procura estimada: ${p.volume.toLocaleString('pt-PT')} pesquisas por mês.`);
  else razoes.push('O fornecedor não indica procura mensal nesta consulta.');
  if (p.dificuldade === null) lacunas.push('Dificuldade orgânica indisponível');
  else if (p.dificuldade <= 40) razoes.push('Dificuldade orgânica até 40; confirmar concorrentes na SERP.');
  if (!p.intencao) lacunas.push('Intenção indisponível');
  else if (['commercial', 'transactional'].includes(p.intencao)) razoes.push('Intenção comercial: avaliar ligação natural à oferta do site.');
  if (propria) razoes.push('Já existe uma página para esta keyword: avaliar atualização.');
  if (pauta) razoes.push('O plano já tem esta keyword; reutilizar a pauta existente.');
  const adequacao = proibido ? 'excluida' : temas.length ? 'alinhada' : 'confirmar';
  return { adequacao, prioridade: adequacao === 'alinhada' && p.volume !== null && p.volume > 0 && p.dificuldade !== null && p.dificuldade <= 40 ? 'alta' : adequacao === 'alinhada' ? 'media' : 'rever', destino: propria ? 'atualizar' : pauta ? 'pauta_existente' : 'criar', razoes, lacunas, urlExistente: propria?.url, pautaId: pauta?.id };
}
export const ordemOportunidade = (o: OportunidadeEditorial) => ({ alta: 0, media: 1, rever: 2 })[o.prioridade] + (o.adequacao === 'excluida' ? 10 : 0);
