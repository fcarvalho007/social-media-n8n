import type { DocumentoAcervo } from './modelo';
import type { PaginaLida } from '@/features/motor/fontePdf';

export const normalizarPesquisa = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-PT').trim();
export const tamanhoPt = (n: number) => n < 1048576 ? `${Math.ceil(n / 1024)} KB` : `${(n / 1048576).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} MB`;
export function dataPt(s: string | null | undefined) { const d = new Date(s ?? ''); return Number.isNaN(d.getTime()) ? 'Não verificada' : d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Lisbon' }); }
export function paginaValida(p: number, total: number, tamanho: number) { return Math.min(Math.max(1, Math.floor(Number.isFinite(p) ? p : 1)), Math.max(1, Math.ceil(total / tamanho))); }
export function ordenarDocumentos(docs: DocumentoAcervo[], ordem: string) {
  return docs.slice().sort((a, b) => ordem === 'titulo' ? a.titulo.localeCompare(b.titulo, 'pt-PT') : ordem === 'paginas' ? b.pdf.paginas.length - a.pdf.paginas.length : b.recolhidoEm.localeCompare(a.recolhidoEm) || a.titulo.localeCompare(b.titulo, 'pt-PT'));
}
export function selecionarIntervalo(valor: string, paginas: PaginaLida[]) {
  if (!valor.trim()) throw new Error('Indica páginas, por exemplo 1–3, 7.');
  const selecionadas = new Set<number>();
  for (const parte of valor.split(',')) {
    const m = parte.trim().match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/);
    if (!m) throw new Error('Usa números e intervalos separados por vírgulas, por exemplo 1–3, 7.');
    const inicio = Number(m[1]), fim = Number(m[2] ?? m[1]);
    if (inicio < 1 || fim < inicio || fim > paginas.length) throw new Error(`Escolhe páginas entre 1 e ${paginas.length}, por ordem crescente em cada intervalo.`);
    for (let n = inicio; n <= fim; n++) selecionadas.add(n);
  }
  const semTexto = [...selecionadas].filter(n => paginas.find(p => p.n === n)?.estado !== 'texto');
  semTexto.forEach(n => selecionadas.delete(n));
  return { selecionadas, semTexto };
}
export function selecionarInicio(paginas: PaginaLida[], max = 20000) {
  const escolhidas = new Set<number>(); let tamanho = 0;
  for (const p of paginas) { if (p.estado !== 'texto') continue; const n = p.paragrafos.join('\n\n').length + (escolhidas.size ? 2 : 0); if (tamanho + n > max) break; escolhidas.add(p.n); tamanho += n; }
  return escolhidas;
}
export function unirSelecao(anteriores: Set<number>, novas: number[]) { return new Set([...anteriores, ...novas]); }
export function lerEstadoBiblioteca(p: URLSearchParams) {
  const em = (key: string, valores: string[], fallback: string) => valores.includes(p.get(key) ?? '') ? p.get(key)! : fallback;
  return { tab: em('separador', ['acervo', 'fontes', 'recolher', 'historico'], 'acervo'), pesquisa: (p.get('q') ?? '').slice(0, 300), categoria: p.get('categoria') ?? '', estado: em('estado', ['ativos', 'por_ler', 'lido', 'arquivado', 'eliminados'], 'ativos'), vista: em('vista', ['grelha', 'lista'], 'grelha'), ordem: em('ordem', ['recentes', 'titulo', 'paginas'], 'recentes'), pagina: paginaValida(Number(p.get('pagina') ?? 1), 1000000, 1), id: p.get('documento') };
}
