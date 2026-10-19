import { z } from 'zod';
import type { PaginaLida } from '../motor/fontePdf';

export const resultadoOcrSchema = z.object({
  n: z.number().int().min(1).max(600),
  texto: z.string().max(200000),
  confianca: z.number().finite().min(0).max(100),
}).strict();
export type ResultadoOcr = z.infer<typeof resultadoOcrSchema>;
export interface ProvenienciaOcr {
  motor: 'tesseract-7'; idiomas: 'por+eng'; confianca: number; em: string;
}
export function paginaComOcr(pagina: PaginaLida, resultado: ResultadoOcr): PaginaLida {
  const r = resultadoOcrSchema.parse(resultado);
  if (pagina.n !== r.n || pagina.texto.trim() || pagina.estado === 'texto')
    throw new Error('O OCR só pode preencher uma página sem texto. O texto existente foi preservado.');
  const texto = r.texto.replace(/\0/g, '').trim();
  return { ...pagina, texto, estado: texto ? 'texto' : pagina.estado,
    paragrafos: texto ? texto.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean) : [],
    ocr: { motor: 'tesseract-7', idiomas: 'por+eng', confianca: r.confianca, em: new Date().toISOString() } };
}
export function paginasParaOcr(paginas: PaginaLida[]) {
  return paginas.filter(p => p.estado === 'sem_texto_com_imagem' && !p.texto.trim() && !p.ocr);
}
