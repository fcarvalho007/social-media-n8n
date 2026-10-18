import type { PdfLido } from '@/features/motor/fontePdf';
import type {MetadadosPdfTracker} from './legado';

export const DOCUMENTOS_LOCAL = import.meta.env.DEV && import.meta.env.MODE === 'hub';
export interface DocumentoAcervo {
  id: string; ambito: string; titulo: string; origem: string | null; recolhidoEm: string;
  publicadoEm: string | null; ficheiro: Blob; pdf: PdfLido;
  processamento?:{estado:'a_processar'|'concluido'|'erro';paginas:number;total?:number;erro?:string};
  capaUrl?:string; capa?: Blob; capaErro?: string; fonteNome?: string; categoria?: string; paginaOrigem?: string;
  legado?:MetadadosPdfTracker;
  leitura?:'por_ler'|'lido'|'arquivado';
}
export interface CandidatoPdf { url: string; titulo: string }
export interface Recolha {
  id: string; ambito: string; url: string; em: string;
  estado: 'encontrado' | 'consultado' | 'descarregado' | 'guardado' | 'duplicado' | 'erro';
  detalhe: string; documentoId?: string;
}
export const ambitoAcervo = (user: string, projeto: string) => JSON.stringify([user, projeto]);

export function urlPublica(bruto: string, base?: string): URL {
  if (bruto.length > 2000) throw new Error('O endereço é demasiado longo.');
  let u: URL;
  try { u = new URL(bruto.trim(), base); } catch { throw new Error('Indica um endereço HTTPS válido.'); }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) throw new Error('Usa HTTPS, sem credenciais nem portas adicionais.');
  u.hash = '';
  return u;
}

/** Inert HTML only. A link is a candidate, never evidence that its target is a PDF. */
export function descobrirCandidatos(html: string, origem: string): CandidatoPdf[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tituloPagina = doc.title.replace(/\s+/g, ' ').trim().slice(0, 200);
  const encontrados = new Map<string, CandidatoPdf>();
  for (const el of doc.querySelectorAll('a[href],iframe[src],embed[src],object[data]')) {
    const bruto = el.getAttribute('href') ?? el.getAttribute('src') ?? el.getAttribute('data') ?? '';
    const nome = (el.textContent || el.getAttribute('title') || el.getAttribute('download') || '').replace(/\s+/g, ' ').trim();
    if (!/\.pdf(?:[?#]|$)/i.test(bruto) && !/application\/pdf/i.test(el.getAttribute('type') ?? '') && !/\bpdf\b/i.test(nome)) continue;
    try {
      const u = urlPublica(bruto, origem).href;
      const generico = /^(?:(?:view|download|descarregar|abrir|consultar|ler)\s+)?pdf$/i.test(nome);
      if (!encontrados.has(u)) encontrados.set(u, { url: u, titulo: (generico && tituloPagina ? tituloPagina : nome.slice(0, 200)) || nomeDoFicheiro(u) });
    } catch { /* An unsafe link is not an eligible candidate. */ }
  }
  return [...encontrados.values()].slice(0, 100);
}

export function nomeDoFicheiro(url: string): string {
  let nome = 'documento.pdf';
  try { nome = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? nome); } catch { /* fallback */ }
  nome = Array.from(nome, c => c.charCodeAt(0) < 32 || c === '/' || c === '\\' ? '-' : c).join('').slice(0, 180);
  return /\.pdf$/i.test(nome) ? nome : `${nome}.pdf`;
}

export function temAssinaturaPdf(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-');
}

export function selecionarPaginas(pdf: PdfLido, escolhidas: Set<number>): Set<number> {
  return new Set(pdf.paginas.filter(p => p.estado === 'texto' && !escolhidas.has(p.n)).map(p => p.n));
}

export function referenciaDocumento(d: DocumentoAcervo, paginas: number[]): string {
  return `Fonte: ${d.titulo}\nPáginas: ${paginas.join(', ')}\n${d.origem ? `Origem: ${d.origem}\n` : ''}Recolhido em: ${new Date(d.recolhidoEm).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' })}\nSHA-256: ${d.pdf.hash}`;
}

export function excertoReferenciado(d: DocumentoAcervo, escolhidas: Set<number>): string {
  const paginas = d.pdf.paginas.filter(p => p.estado === 'texto' && escolhidas.has(p.n));
  return `${paginas.map(p => `[Página ${p.n}]\n${p.paragrafos.join('\n\n')}`).join('\n\n')}\n\n${referenciaDocumento(d, paginas.map(p => p.n))}`;
}

export function textoPesquisavelDocumento(d: DocumentoAcervo): string {
  return `${d.titulo} ${d.origem ?? ''} ${d.fonteNome ?? ''} ${d.categoria ?? ''} ${d.legado?.registos.map(r=>[r.tags.join(' '),r.summary_pt,r.summary_1paragraph,r.summary].join(' ')).join(' ')??''} ${d.pdf.paginas.map(p => p.texto).join(' ')}`.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-PT');
}
export function pesquisarDocumento(d: DocumentoAcervo, termo: string): boolean {
  const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-PT');
  const q = normal(termo.trim());
  return !q || textoPesquisavelDocumento(d).includes(q);
}

export function tituloDoDocumento(titulo: string | undefined, pdfTitulo: string | undefined, ficheiro: string): string {
  const generico=!titulo||/^(read(?: more| in pdf)?|here|pdf|download|descarregar|estudo completo(?: \(pdf\))?|resumo(?: \(pdf\))?)$/i.test(titulo.trim())||/^[a-z0-9-]{24,}\.pdf$/i.test(titulo);
  return (generico&&pdfTitulo?pdfTitulo:titulo||pdfTitulo||ficheiro.replace(/\.pdf$/i,'')).slice(0,250);
}
