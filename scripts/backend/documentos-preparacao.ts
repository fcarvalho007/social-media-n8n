import { Buffer } from 'node:buffer';
import { z } from 'zod';
import type { PdfLido } from '../../src/features/motor/fontePdf';
const pagina = z.object({ n: z.number().int().min(1).max(600), estado: z.enum(['texto', 'sem_texto_com_imagem', 'vazia', 'erro']), texto: z.string().max(200000), paragrafos: z.array(z.string().max(200000)).max(20000) }).strict();
const schema = z.object({ pdf: z.object({ hash: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive(), ficheiro: z.string().max(200), titulo: z.string().max(250).optional(), paginas: z.array(pagina).min(1).max(600) }).strict(), capa: z.string().max(2800000) }).strict();
/** Authenticated browser extraction, bound to the original's server-computed hash.
 * Stored as unreviewed source material, never editorial approval. */
export function validarPreparacaoPdf(bruto: unknown, hash: string, bytes: number): { pdf: PdfLido; capa: Uint8Array } {
  if (JSON.stringify(bruto).length > 8000000) throw new Error('A preparação do PDF é demasiado grande.');
  const p = schema.parse(bruto);
  if (p.pdf.hash !== hash || p.pdf.bytes !== bytes || p.pdf.paginas.some((v, i) => v.n !== i + 1)) throw new Error('A preparação não corresponde ao PDF original.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(p.capa)) throw new Error('Capa PNG inválida.');
  const capa = Buffer.from(p.capa, 'base64');
  if (capa.length < 33 || capa.length > 2000000 || capa.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || capa.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Capa PNG inválida.');
  const w = capa.readUInt32BE(16), h = capa.readUInt32BE(20);
  if (!w || !h || w > 2000 || h > 2000 || w * h > 2000000) throw new Error('Capa fora do limite.');
  const paginas = p.pdf.paginas.map(v => { const texto = v.texto.replace(/\0/g, '').trim(); return { ...v, texto, estado: texto ? 'texto' as const : v.estado === 'texto' ? 'sem_texto_com_imagem' as const : v.estado, paragrafos: texto ? texto.split(/\n\s*\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean) : [] }; });
  return { pdf: { ...p.pdf, paginas } as PdfLido, capa };
}
