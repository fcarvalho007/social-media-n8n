import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { schemaPesquisa, mercados, type DadosPesquisa, type PesquisaSeo, type PalavraSeo } from '../../src/features/seo/contratos';
import { OPERACOES_SEO } from '../../src/features/seo/precos';
export type Json = Record<string, unknown>;
export const objeto = (x: unknown): Json => x && typeof x === 'object' && !Array.isArray(x) ? x as Json : {};
export const vetor = (x: unknown): unknown[] => Array.isArray(x) ? x : [];
export const numero = (x: unknown): number | null => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
const str = (x: unknown) => typeof x === 'string' ? x : '';
export function dominioSeo(bruto: string) {
  let u: URL; try { u = new URL(bruto.includes('://') ? bruto : `https://${bruto}`); } catch { throw new Error('Indica um domínio válido, por exemplo digitalfc.pt.'); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port || u.search || u.hash || u.pathname !== '/') throw new Error('Usa apenas o domínio, sem credenciais, caminho, parâmetros ou porta.');
  const d = u.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(d) || /\.(local|localhost|internal|test|invalid)$/.test(d)) throw new Error('Usa um domínio público válido.');
  return d;
}
export function prepararPesquisa(bruto: unknown): PesquisaSeo {
  const p = schemaPesquisa.parse(bruto) as PesquisaSeo;
  p.termos = [...new Set(p.termos.map(t => t.normalize('NFC').toLowerCase()))];
  const entrada = OPERACOES_SEO[p.operacao].entrada;
  if (entrada === 'termo' && p.termos.length !== 1) throw new Error('Esta pesquisa aceita um termo de cada vez.');
  if (p.operacao === 'ideias' && p.termos.length > 20) throw new Error('Usa até 20 termos por pesquisa de ideias.');
  if (entrada === 'dominio' || entrada === 'lacunas') p.dominio = dominioSeo(p.dominio);
  else p.dominio = '';
  if (entrada === 'lacunas') { p.concorrente = dominioSeo(p.concorrente); if (p.dominio === p.concorrente) throw new Error('Escolhe dois domínios diferentes.'); } else p.concorrente = '';
  if (p.operacao === 'serp' && (p.limite > 100 || /[:%]/.test(p.termos[0]))) throw new Error('SERP: escolhe até 100 resultados e pesquisa sem operadores ou códigos percentuais nesta versão.');
  if (p.modo === 'sandbox' && p.operacao === 'volume') throw new Error('O teste Sandbox não está disponível para Google Ads neste percurso. Usa o exemplo local ou o modo real com aprovação de custo.');
  return p;
}
export function corpoDataforseo(p: PesquisaSeo): Json {
  const mercado = mercados[p.mercado];
  const base = { location_name: mercado.location_name, language_code: mercado.language_code };
  if (p.operacao === 'volume') return { ...base, keywords: p.termos, search_partners: false };
  if (p.operacao === 'serp') return { ...base, keyword: p.termos[0], depth: p.limite, device: 'desktop', os: 'windows', calculate_rectangles: false, load_async_ai_overview: false, people_also_ask_click_depth: 0 };
  if (p.operacao === 'visao') return { ...base, keywords: p.termos, include_clickstream_data: false, include_serp_info: true };
  if (p.operacao === 'ideias') return { ...base, keywords: p.termos, limit: p.limite, include_serp_info: true, include_clickstream_data: false };
  if (p.operacao === 'dominio') return { ...base, target: p.dominio, limit: p.limite, item_types: ['organic'], include_clickstream_data: false };
  if (p.operacao === 'lacunas') return { ...base, target1: p.concorrente, target2: p.dominio, intersections: false, item_types: ['organic'], limit: p.limite, include_serp_info: true, include_clickstream_data: false };
  return { ...base, keyword: p.termos[0], limit: p.limite, include_seed_keyword: false, include_serp_info: true, include_clickstream_data: false, ...(p.operacao === 'relacionadas' ? { depth: 1 } : {}) };
}
export function chavePesquisa(p: PesquisaSeo) { return createHash('sha256').update(JSON.stringify([p.modo, OPERACOES_SEO[p.operacao].endpoint, corpoDataforseo(p)])).digest('hex'); }
export function linkSeguroSeo(v: unknown): string | null { try { const u = new URL(str(v)); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } }
function palavra(v: unknown): PalavraSeo | null {
  const item = objeto(v), k = objeto(item.keyword_data ?? item), info = objeto(k.keyword_info), properties = objeto(k.keyword_properties), intent = objeto(k.search_intent_info);
  if (!str(k.keyword)) return null;
  const elemento = objeto(item.ranked_serp_element ?? item.first_domain_serp_element);
  const serp = objeto(elemento.serp_item ?? elemento.organic ?? elemento);
  return { palavra: str(k.keyword), volume: numero(info.search_volume ?? k.search_volume), dificuldade: numero(properties.keyword_difficulty), cpc: numero(info.cpc ?? k.cpc), concorrenciaAds: numero(info.competition) ?? (numero(k.competition_index) === null ? null : Number(k.competition_index) / 100), intencao: str(intent.main_intent) || null, atualizadoEm: str(info.last_updated_time) || null, meses: vetor(info.monthly_searches ?? k.monthly_searches).flatMap(m => { const o = objeto(m); return numero(o.year) !== null && numero(o.month) !== null ? [{ ano: Number(o.year), mes: Number(o.month), volume: numero(o.search_volume) }] : []; }), posicao: numero(serp.rank_group), url: linkSeguroSeo(serp.url) };
}
export function normalizarResposta(raw: unknown, p: PesquisaSeo): DadosPesquisa {
  const j = objeto(raw), task = objeto(vetor(j.tasks)[0]), results = vetor(task.result), first = objeto(results[0]);
  const dados: DadosPesquisa = { palavras: [], serp: [], perguntas: [], totalDisponivel: numero(first.total_count), avisos: [] };
  if (p.operacao === 'serp') {
    for (const it of vetor(first.items)) { const o = objeto(it), tipo = str(o.type); if (tipo === 'people_also_ask') dados.perguntas.push(...vetor(o.items).map(x => str(objeto(x).title)).filter(Boolean)); else if (['organic','paid','featured_snippet','top_stories','video'].includes(tipo)) dados.serp.push({ tipo, titulo: str(o.title), url: linkSeguroSeo(o.url), dominio: str(o.domain) || null, descricao: str(o.description), posicao: numero(o.rank_group) }); }
  } else dados.palavras = (p.operacao === 'volume' ? results : vetor(first.items)).map(palavra).filter((x): x is PalavraSeo => !!x);
  if (p.operacao === 'volume') dados.avisos.push('Concorrência Google Ads refere-se a anúncios. Não é dificuldade orgânica. Volumes de variantes próximas podem ser agrupados pelo Google.');
  if (p.modo !== 'real') dados.avisos.push(p.modo === 'exemplo' ? 'Exemplo sintético local. Estes números não medem pesquisas reais.' : 'Sandbox do fornecedor: respostas fixas de teste, sem valor para decisões de mercado.');
  if (!dados.palavras.length && !dados.serp.length) dados.avisos.push('O fornecedor não devolveu resultados para esta consulta. Ausência de dados não significa volume zero.');
  return dados;
}
export function exemploPesquisa(p: PesquisaSeo): DadosPesquisa {
  const seed = p.termos[0];
  const palavras = (['visao', 'volume'].includes(p.operacao) ? p.termos : [seed, `${seed} para empresas`, `como aplicar ${seed}`, `${seed} exemplos`, `${seed} formação`, `${seed} ferramentas`, `${seed} estratégia`, `${seed} guia prático`]).slice(0, p.limite).map((palavra, i): PalavraSeo => ({ palavra, volume: [1900,720,590,480,320,260,170,110][i % 8], dificuldade: [68,34,29,41,22,39,24,18][i % 8], cpc: 1.2 + i / 10, concorrenciaAds: 0.3, intencao: i === 4 ? 'commercial' : 'informational', atualizadoEm: null, meses: Array.from({ length: 12 }, (_, j) => ({ ano: 2026, mes: j + 1, volume: 100 + (j + i) * 20 })), posicao: p.operacao === 'dominio' ? i + 3 : null, url: null }));
  return { palavras: p.operacao === 'serp' ? [] : palavras, serp: p.operacao === 'serp' ? [{ tipo: 'organic', titulo: `Exemplo de resultado para ${seed}`, url: null, dominio: 'domínio de demonstração', descricao: 'Conteúdo sintético para rever a interface, sem consulta ao Google.', posicao: 1 }] : [], perguntas: p.operacao === 'serp' ? [`Como começar com ${seed}?`, `Que critérios usar em ${seed}?`] : [], totalDisponivel: null, avisos: ['Exemplo sintético local. Estes números não medem pesquisas reais.'] };
}
export async function pedirDataforseo(p: PesquisaSeo, cred: { login: string; password: string }, f: typeof fetch = fetch): Promise<{ raw: Json; http: number }> {
  const host = p.modo === 'sandbox' ? 'sandbox.dataforseo.com' : 'api.dataforseo.com';
  const r = await f(`https://${host}/v3/${OPERACOES_SEO[p.operacao].endpoint}`, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${cred.login}:${cred.password}`).toString('base64')}` }, body: JSON.stringify([corpoDataforseo(p)]), signal: AbortSignal.timeout(45000) });
  const text = await r.text(); if (Buffer.byteLength(text) > 16 * 1024 * 1024) throw new Error('A resposta excedeu o limite local. Confirma o custo no painel do fornecedor antes de repetir.');
  let raw: Json; try { raw = objeto(JSON.parse(text)); } catch { throw new Error('O fornecedor não devolveu uma resposta verificável. O custo ficou por confirmar; não vamos repetir automaticamente.'); }
  return { raw, http: r.status };
}
