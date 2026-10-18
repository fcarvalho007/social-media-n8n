/** Shared, read-only search projection. No HTML from sources is rendered. */
export const TIPOS_PESQUISA = ['pdf', 'noticia', 'artigo', 'social'] as const;
export type TipoPesquisa = typeof TIPOS_PESQUISA[number];
export const NOMES_PESQUISA: Record<TipoPesquisa, string> = { pdf: 'PDFs', noticia: 'Notícias', artigo: 'Artigos', social: 'Peças sociais' };
export interface ItemPesquisa {
  id: string; tipo: TipoPesquisa; titulo: string; texto: string; url: string; contexto: string;
  atualizadoEm: string; paginas?: { n: number; texto: string }[];
}
export interface CatalogoPesquisa { itens: ItemPesquisa[]; incompletos?: TipoPesquisa[]; avisos: string[]; recolhidoEm: string }
export interface ResultadoPesquisa extends Omit<ItemPesquisa, 'texto' | 'paginas'> { excerto: string; pagina?: number }
export interface RespostaPesquisa { itens: ResultadoPesquisa[]; total: number; pagina: number; paginas: number; contagens: Record<TipoPesquisa, number>; incompletos: TipoPesquisa[]; avisos: string[]; recolhidoEm: string }
export const normalizarPesquisaHub = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-PT');
export function termosPesquisa(s: string) { return normalizarPesquisaHub(s.trim()).split(/\s+/).filter(Boolean); }
export function textoPlano(s: string) { return s.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot);/g, ' ').replace(/\s+/g, ' ').trim(); }
function excerto(texto: string, termos: string[]) {
  const limpo = textoPlano(texto), normal = normalizarPesquisaHub(limpo);
  const posicoes = termos.map(t => normal.indexOf(t)).filter(p => p >= 0);
  const inicio = Math.max(0, (posicoes.length ? Math.min(...posicoes) : 0) - 65);
  return `${inicio ? '…' : ''}${limpo.slice(inicio, inicio + 240)}${limpo.length > inicio + 240 ? '…' : ''}`;
}
export function pesquisarCatalogo(c: CatalogoPesquisa, consulta: string, tipo: TipoPesquisa | 'todos' = 'todos', pagina = 1, tamanho = 20): RespostaPesquisa {
  const termos = termosPesquisa(consulta), contagens = { pdf: 0, noticia: 0, artigo: 0, social: 0 };
  const encontrados: { item: ItemPesquisa; pagina?: number; corpo: string; pontos: number }[] = [];
  if (consulta.trim().length >= 2 && termos.length) for (const item of c.itens) {
    const titulo = normalizarPesquisaHub(item.titulo), base = `${titulo} ${normalizarPesquisaHub(item.contexto)} ${normalizarPesquisaHub(textoPlano(item.texto))}`;
    const folhas = item.paginas?.map(p => ({ ...p, normal: normalizarPesquisaHub(p.texto) }));
    const folha = folhas?.find(p => termos.every(t => `${base} ${p.normal}`.includes(t)) && termos.some(t => p.normal.includes(t)));
    // PDF terms must coexist on one page (or its metadata), not across unrelated pages.
    if (!termos.every(t => base.includes(t)) && !folha) continue;
    contagens[item.tipo]++;
    encontrados.push({ item, pagina: folha?.n, corpo: folha?.texto || item.texto, pontos: termos.reduce((n, t) => n + (titulo.includes(t) ? 3 : 0), 0) });
  }
  const filtrados = encontrados.filter(x => tipo === 'todos' || x.item.tipo === tipo).sort((a, b) => b.pontos - a.pontos || b.item.atualizadoEm.localeCompare(a.item.atualizadoEm) || a.item.id.localeCompare(b.item.id));
  const paginas = Math.max(1, Math.ceil(filtrados.length / tamanho)), atual = Math.max(1, Math.min(paginas, Math.floor(pagina) || 1));
  return { total: filtrados.length, pagina: atual, paginas, contagens, incompletos: c.incompletos ?? [], avisos: c.avisos, recolhidoEm: c.recolhidoEm, itens: filtrados.slice((atual - 1) * tamanho, atual * tamanho).map(({ item: { texto, paginas: _, ...item }, pagina, corpo }) => ({ ...item, ...(pagina ? { pagina } : {}), excerto: excerto(corpo, termos), url: item.tipo === 'pdf' ? `${item.url}&termo=${encodeURIComponent(consulta.trim())}${pagina ? `&pagina=${pagina}` : ''}` : item.url })) };
}
/** Index only editorial text, never asset URLs, credentials or opaque metadata. */
export function textoSocial(v: unknown, profundidade = 0): string {
  if (profundidade > 12 || !v || typeof v !== 'object') return '';
  if (Array.isArray(v)) return v.map(x => textoSocial(x, profundidade + 1)).join(' ');
  return Object.entries(v).map(([k, x]) => ['titulo', 'texto', 'conteudo', 'caption', 'legenda'].includes(k) && typeof x === 'string' ? x : typeof x === 'object' && ['paginas', 'camadas', 'slides', 'documento', 'variantes', 'A', 'B', 'pacote', 'story', 'carrossel', 'composicoes'].includes(k) ? textoSocial(x, profundidade + 1) : '').join(' ');
}
