import { z } from 'zod';
import type { FonteEditorial, PautaEditorial, SiteEditorial } from './contratos';

export const formatosArtigo = { guia: 'Guia prático', tutorial: 'Tutorial passo a passo', analise: 'Análise de uma novidade', comparacao: 'Comparação com critérios', glossario:'Glossário educativo' } as const;
export const guiaInicial = { formato: 'guia' as const, intencao: 'informativa' as const, instrucoes: '', acao: 'novo' as const, urlExistente: '' };
export const schemaGuia = z.object({
  formato: z.enum(['guia', 'tutorial', 'analise', 'comparacao', 'glossario']), intencao: z.enum(['informativa', 'comercial', 'transacional']),
  instrucoes: z.string().max(4000), acao: z.enum(['novo', 'atualizar']), urlExistente: z.string().max(2000),
}).strict();
export type GuiaArtigo = z.infer<typeof schemaGuia>;
export const schemaEstrutura = z.object({
  pergunta: z.string().trim().min(10).max(500), titulo: z.string().trim().min(5).max(200),
  secoes: z.array(z.object({ titulo: z.string().trim().min(3).max(180), pontos: z.string().trim().min(20).max(1600), fonteIds: z.array(z.string().min(1).max(80)).max(8) }).strict()).min(2).max(10),
  alertas: z.array(z.string().max(1000)).max(20),
}).strict();
export interface EstruturaArtigo { pergunta: string; titulo: string; secoes: { titulo: string; pontos: string; fonteIds: string[] }[]; alertas: string[] }
export interface EstruturaGuardada { conteudo: EstruturaArtigo; assinaturaBase: string; confirmadaEm: string; origem: 'humana' | 'automatica' }
export const schemaDocumentoReferencia = z.object({ id: z.string().uuid(), hash: z.string().regex(/^[a-f0-9]{64}$/), paginas: z.array(z.number().int().positive().max(10000)).min(1).max(20).refine(p=>new Set(p).size===p.length,'Seleciona cada página uma única vez.') }).strict();
export const schemaFonteConhecimento = z.object({
  id: z.string().min(1).max(80), titulo: z.string().max(300), url: z.string().max(2000),
  excerto: z.string().max(12000), verificadaEm: z.string().max(40), aprovada: z.boolean(),
  documento: schemaDocumentoReferencia.optional(),
}).strict().refine(f => origemFonteValida(f), 'Usa uma fonte pública HTTPS ou uma referência de PDF do acervo.');
export const schemaVerificacaoPagina = z.object({ em: z.string().datetime(), http: z.number().int().nullable(), canonical: z.string().max(2000).nullable(), indexavel: z.boolean(), detalhe: z.string().max(1000) }).strict();
export const schemaPaginaMarca = z.object({
  id: z.string().min(1).max(80), titulo: z.string().trim().min(3).max(200), url: z.string().url().max(2000),
  tema: z.string().trim().min(3).max(500), keyword: z.string().max(80), tipo: z.enum(['artigo', 'oferta', 'recurso']),
  aprovada: z.boolean(), verificadaEm: z.string().max(40), verificacao: schemaVerificacaoPagina.optional(),
}).strict();
export const schemaConhecimento = z.object({
  revista: z.number().int().nonnegative(), instrucoes: z.string().max(6000), evitar: z.array(z.string().trim().min(2).max(100)).max(30),
  referencias: z.array(schemaFonteConhecimento).max(12), paginas: z.array(schemaPaginaMarca).max(100),
  vozEditorial: z.object({ tratamento: z.enum(['tu', 'voce', 'impessoal']), amostras: z.array(z.string().trim().min(40).max(2000)).max(3), termosPreferidos: z.array(z.object({ evitar: z.string().trim().min(2).max(80), usar: z.string().trim().min(2).max(80) }).strict()).max(20) }).strict().optional(),
}).strict();
export interface PaginaMarca { id: string; titulo: string; url: string; tema: string; keyword: string; tipo: 'artigo' | 'oferta' | 'recurso'; aprovada: boolean; verificadaEm: string; verificacao?: z.infer<typeof schemaVerificacaoPagina> }
export interface ConhecimentoMarca { revista: number; instrucoes: string; evitar: string[]; referencias: FonteEditorial[]; paginas: PaginaMarca[]; vozEditorial?: { tratamento: 'tu' | 'voce' | 'impessoal'; amostras: string[]; termosPreferidos: { evitar: string; usar: string }[] } }
export const vozEditorialVazia = (): NonNullable<ConhecimentoMarca['vozEditorial']> => ({ tratamento: 'tu', amostras: [], termosPreferidos: [] });
export const conhecimentoVazio = (): ConhecimentoMarca => ({ revista: 0, instrucoes: '', evitar: [], referencias: [], paginas: [] });
const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const palavras = (s: string) => new Set(normal(s).split(/[^a-z0-9]+/).filter(p => (p.length > 3 || ['ia','seo','sms'].includes(p)) && !['para', 'como', 'mais', 'pelo', 'pela', 'sobre', 'esta', 'este', 'seus', 'suas', 'guia', 'artigo'].includes(p)));
function afinidade(a: string, b: string) { const x = palavras(a), y = palavras(b); return [...x].filter(t => y.has(t)).length; }
export function urlPublicaEditorial(v: string) {
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.hash && !u.search && !/^(localhost|\d+\.\d+\.\d+\.\d+)$|\[/.test(u.hostname); } catch { return false; }
}
export function origemFonteValida(f: { url?: string; documento?: unknown }) {
  if (f.documento && schemaDocumentoReferencia.safeParse(f.documento).success && f.url === '') return true;
  try { const u = new URL(f.url??''); return u.protocol === 'https:' && !u.username && !u.password && !u.port && !/localhost|127\.0\.0\.1|\[/.test(u.hostname); } catch { return false; }
}
export function mesmaFonte(a: FonteEditorial, b: FonteEditorial) { return a.documento && b.documento ? a.documento.hash === b.documento.hash && [...a.documento.paginas].sort((x,y)=>x-y).join(',') === [...b.documento.paginas].sort((x,y)=>x-y).join(',') : !a.documento && !b.documento && a.url === b.url; }
export function paginaElegivel(p: PaginaMarca, s: SiteEditorial) { return p.aprovada && !!p.verificadaEm && paginaDoSite(p.url, s) && (!p.verificacao || p.verificacao.http === 200 && p.verificacao.indexavel && (!p.verificacao.canonical || p.verificacao.canonical === p.url)); }
export function paginaDoSite(v: string, s: SiteEditorial) {
  if (!urlPublicaEditorial(v)) return false;
  const u = new URL(v);
  return u.hostname.replace(/^www\./, '') === s.dominio.replace(/^www\./, '') && !/\/(wp-admin|wp-login|wp-json|wp-content|login|conta|account|my-account|minha-conta|search|pesquisa|checkout|checkouts|cart|carrinho|privacy-policy|politica-de-privacidade|termos-e-condicoes|politica-de-cookies|feed)(?:[/.]|$)/i.test(u.pathname) && !/\.(?:pdf|xml|kml|jpe?g|png|gif|webp|avif|svg|mp[34]|zip|docx?|xlsx?)(?:\/|$)/i.test(u.pathname);
}
export function sugerirConhecimento(p: Pick<PautaEditorial, 'titulo' | 'palavra'>, s: SiteEditorial) {
  const c = s.conhecimento ?? conhecimentoVazio(), tema = `${p.titulo} ${p.palavra}`;
  const fontes = c.referencias.filter(f => f.aprovada && f.excerto.length >= 200 && f.verificadaEm && afinidade(tema, `${f.titulo} ${f.excerto}`) > 0)
    .sort((a, b) => afinidade(tema, `${b.titulo} ${b.excerto}`) - afinidade(tema, `${a.titulo} ${a.excerto}`)).slice(0, 3);
  const paginas = c.paginas.filter(f => paginaElegivel(f, s) && afinidade(tema, `${f.titulo} ${f.tema} ${f.keyword}`) > 0)
    .sort((a, b) => afinidade(tema, `${b.titulo} ${b.tema}`) - afinidade(tema, `${a.titulo} ${a.tema}`)).slice(0, 3);
  return { fontes, paginas };
}
export function bloqueiosEstrutura(r: EstruturaArtigo, fontes: FonteEditorial[]) {
  const ids = new Set(fontes.filter(f => f.aprovada).map(f => f.id)), falhas: string[] = [];
  if (!schemaEstrutura.safeParse(r).success) return ['Completa a pergunta e pelo menos duas secções com pontos concretos.'];
  if (r.alertas.length) falhas.push(...r.alertas);
  if (r.secoes.some(s => !s.fonteIds.length || s.fonteIds.some(id => !ids.has(id)))) falhas.push('Cada secção precisa de fontes aprovadas que sustentem o que será escrito.');
  if (new Set(r.secoes.map(s => normal(s.titulo.trim()))).size !== r.secoes.length) falhas.push('Retira secções repetidas da estrutura.');
  return [...new Set(falhas)];
}
export interface VerificacaoEditorial { id: string; nivel: 'bloqueio' | 'aviso' | 'ok'; nome: string; detalhe: string }
export function verificarArtigo(p: PautaEditorial, s: SiteEditorial, outras: PautaEditorial[] = []): VerificacaoEditorial[] {
  const t = p.texto, corpo = t?.corpo ?? '', c = s.conhecimento ?? conhecimentoVazio(), v: VerificacaoEditorial[] = [];
  const add = (id: string, nome: string, falha: boolean, detalhe: string, nivel: 'bloqueio' | 'aviso' = 'aviso') => v.push({ id, nome, nivel: falha ? nivel : 'ok', detalhe: falha ? detalhe : 'Sem problema detetado nesta verificação.' });
  add('texto', 'Texto disponível', !t || corpo.trim().length < 500, 'Prepara e revê o texto antes de o aprovar.', 'bloqueio');
  add('html', 'Marcação e instruções pendentes', /<\/?[a-z][^>]*>|\b(?:TODO|TBD|lorem ipsum)\b|\[(?:inserir|preencher|adicionar)\b/i.test(corpo), 'Remove HTML ou instruções que ainda não são conteúdo final.', 'bloqueio');
  add('estrutura', 'Secções do artigo', (corpo.match(/^##\s+.+$/gm) ?? []).length < 2, 'O texto precisa de uma estrutura legível; revê os subtítulos.');
  add('resumo', 'Descrição para pesquisa', !t?.resumo.trim() || t.resumo.length > 180, 'Prepara uma descrição útil e concisa (até 180 caracteres é a referência editorial, não uma garantia do Google).');
  const repetidas = corpo.split(/\n\s*\n/).filter(x => x.trim().length > 80).map(x => normal(x.trim()));
  add('repeticao', 'Repetição de parágrafos', new Set(repetidas).size !== repetidas.length, 'Há parágrafos iguais. Consolida a informação repetida.');
  const urls = [...corpo.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map(m => m[1]);
  const internas = urls.filter(u => { try { return new URL(u).hostname.replace(/^www\./, '') === s.dominio.replace(/^www\./, ''); } catch { return false; } });
  add('links', 'Ligações internas aprovadas', internas.some(u => !c.paginas.some(f => f.url === u && paginaElegivel(f, s))), 'Há ligações internas sem aprovação ou com destino inválido. Confirma destino e contexto.', 'bloqueio');
  add('links-externos', 'Ligações externas com origem conhecida', urls.filter(u=>!internas.includes(u)).some(u=>!p.fontes.some(f=>f.aprovada&&f.url===u)), 'Há ligações externas que não constam das fontes confirmadas. Confirma a origem antes de as usar.', 'bloqueio');
  add('links-ausentes', 'Continuação da leitura', !internas.length && sugerirConhecimento(p, s).paginas.length > 0, 'Há páginas relevantes no inventário; avalia uma ligação natural, sem a forçar.');
  add('vocabulario', 'Vocabulário da marca', [...c.evitar,...(c.vozEditorial?.termosPreferidos.map(t=>t.evitar)??[])].some(x => normal(corpo).includes(normal(x))), 'O texto usa expressões que a marca pediu para evitar.');
  const jaExiste = c.paginas.filter(x => x.aprovada && x.verificadaEm && x.tipo === 'artigo' && normal(x.keyword.trim()) === normal(p.palavra.trim()) && p.palavra.trim());
  add('arquivo', 'Criar ou atualizar', jaExiste.length > 0 && p.guia?.acao !== 'atualizar', `Já existe conteúdo para esta keyword: ${jaExiste.map(x => x.url).join(', ')}. Decide se deves atualizar essa página.`, 'bloqueio');
  add('plano', 'Sobreposição no plano', outras.some(x => x.id !== p.id && x.siteId === p.siteId && p.palavra.trim() && normal(x.palavra.trim()) === normal(p.palavra.trim())), 'Outra pauta do mesmo site tem a mesma keyword. Revê a intenção antes de criar outra página.');
  add('atualizar', 'Destino da atualização', p.guia?.acao === 'atualizar' && (!paginaDoSite(p.guia.urlExistente, s) || !c.paginas.some(x => x.url === p.guia?.urlExistente && x.aprovada)), 'Escolhe uma URL aprovada do próprio site para atualizar.', 'bloqueio');
  return v;
}
