import { comporFontePdf, type PdfLido } from '@/features/motor/fontePdf';
import { excertoReferenciado, referenciaDocumento, selecionarPaginas, type DocumentoAcervo } from './modelo';
import { LIMITES_PDF } from '../../../supabase/functions/_shared/motor/fontes';
import type { ArtigoFonteLido } from './contratos';

export interface FonteAcervo {
  tipo: 'acervo-local-v1'; userId: string; projetoId: string; titulo: string; texto: string;
  referencia: string; artigo: string; pdf: PdfLido; excluidas: number[];
  modo?: 'pdf' | 'excerto';
}
export function prepararFonte(d: DocumentoAcervo, escolhidas: Set<number>, userId: string, projetoId: string): FonteAcervo {
  const excluidas = selecionarPaginas(d.pdf, escolhidas);
  const { texto } = comporFontePdf(d.pdf, excluidas, false);
  if (texto.length < 40) throw new Error('Seleciona páginas com pelo menos 40 caracteres de texto.');
  if (texto.length > 20000) throw new Error('Seleciona menos páginas: o compositor recebe até 20 000 caracteres por fonte.');
  const paginas = d.pdf.paginas.filter(p => p.estado === 'texto' && escolhidas.has(p.n)).map(p => p.n);
  const extenso=d.pdf.bytes>LIMITES_PDF.maxBytes||d.pdf.paginas.length>LIMITES_PDF.maxPaginas;
  return { tipo: 'acervo-local-v1', userId, projetoId, titulo: d.titulo, texto, pdf: extenso?{...d.pdf,paginas:[]}:d.pdf, excluidas: extenso?[]:[...excluidas], referencia: referenciaDocumento(d, paginas), artigo: excertoReferenciado(d, escolhidas), modo:extenso?'excerto':'pdf' };
}
export function lerFonteAcervo(state: unknown, userId: string | undefined): FonteAcervo | null {
  const s = (state as { fonteAcervo?: FonteAcervo } | null)?.fonteAcervo;
  return s?.tipo === 'acervo-local-v1' && s.userId === userId && !!s.projetoId && typeof s.texto === 'string' && s.texto.length <= 20000 && Array.isArray(s.pdf?.paginas) ? s : null;
}

export interface FonteArtigoAcervo {tipo:'artigo-acervo-local-v1';userId:string;projetoId:string;titulo:string;artigo:string}
export function prepararArtigoAcervo(f:ArtigoFonteLido,userId:string,projetoId:string):FonteArtigoAcervo{
  return{tipo:'artigo-acervo-local-v1',userId,projetoId,titulo:f.titulo,artigo:`${f.texto}\n\nFonte: ${f.fonteNome}\nURL: ${f.url}\nPágina de descoberta: ${f.origem}\n${f.parcial?'Fonte parcial: excerto limitado a 20 000 caracteres.\n':''}Data de publicação: ${f.publicadoEm??'não verificada'}\nSHA-256 do HTML consultado: ${f.hash}`};
}
export function lerArtigoAcervo(state:unknown,userId:string|undefined):FonteArtigoAcervo|null{
  const f=(state as {fonteArtigo?:FonteArtigoAcervo}|null)?.fonteArtigo;
  return f?.tipo==='artigo-acervo-local-v1'&&f.userId===userId&&!!f.projetoId&&typeof f.artigo==='string'&&f.artigo.length<=24000?f:null;
}
