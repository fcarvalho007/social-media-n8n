export interface FonteDocumento {
  id: number; name: string; url: string; alternative_urls: string[]; group_category: string;
  region: string; priority: string; active: boolean; tags: string[]; display_order: number;
}
export interface DescobertaDocumento {
  url: string; titulo: string; tipo: 'pdf' | 'artigo'; origem: string; publicadoEm: string | null;
}
export interface EvidenciaFonte {
  fonteId: number; nome: string; url: string; estado: 'a_consultar' | 'concluida' | 'limitada' | 'erro' | 'bloqueada';
  paginas: number; pdfs: number; novidades: number; detalhes: string[]; finalUrl?: string;
}
export interface PdfRecolhido extends DescobertaDocumento { hash: string; bytes: number; fonteId: number; nomeFonte: string; categoria?: string; estado: 'descarregado' | 'guardado' | 'erro'; erro?: string; documentoId?: string; capaCriada?: boolean; capaErro?: string;legado?:import('./legado').MetadadosPdfTracker }
export interface TarefaDocumentos {
  id: string; ambito: string; modo: 'diagnostico' | 'recolher'; estado: 'em_curso' | 'concluida' | 'interrompida';
  iniciadaEm: string; terminadaEm?: string; atual: string; total: number; fontes: EvidenciaFonte[];
  descobertas: (DescobertaDocumento & { fonteId: number; nomeFonte: string; nova: boolean })[];
  pdfs: PdfRecolhido[]; erros: string[];
}
export interface MarkupNo { textContent: string | null; getAttribute(nome: string): string | null; querySelector(s: string): MarkupNo | null; querySelectorAll(s: string): Iterable<MarkupNo>; closest?(s:string):MarkupNo|null; remove?():void }
export type MarkupDocumento = Pick<MarkupNo, 'querySelector' | 'querySelectorAll'>;

export const LIMITES_ACERVO = { maxBytes: 50 * 1024 * 1024, maxPaginas: 600 } as const;
export const LIMITES_RECOLHA = { paginasPorFonte: 4, pdfsPorFonte: 3, tentativasPdfPorFonte: 8, pdfsPorTarefa: 12, bytesPorTarefa: 150 * 1024 * 1024, timeoutFonte: 65000 } as const;
export const CATEGORIAS_DOCUMENTOS:Record<string,string>={ consultoras:'Consultoras',economia_financas:'Economia e finanças',labs_ia:'Investigação em IA',marketing_digital:'Marketing digital',economia_digital:'Economia digital',organizacoes_internacionais:'Organizações internacionais',estatisticas_oficiais:'Estatísticas oficiais',universidades:'Universidades',associacoes:'Associações',linkedin:'Do LinkedIn' };
export interface ArtigoFonteLido { titulo:string;url:string;origem:string;texto:string;publicadoEm:string|null;fonteNome:string;parcial:boolean;hash:string }
