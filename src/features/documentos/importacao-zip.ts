import { z } from 'zod';
import { documentosLegado, type CatalogoPdfTracker } from './legado';
const MAX_ZIP = 350 * 1024 * 1024;
/** Check central directory sizes before any decompression; refuse ZIP64, encryption and traversal. */
export function conferirZip(bytes: ArrayBuffer) {
  if (bytes.byteLength > MAX_ZIP || bytes.byteLength < 22) throw new Error('Escolhe o ZIP do acervo até 350 MB.');
  const v = new DataView(bytes); let fim = bytes.byteLength - 22;
  while (fim >= Math.max(0, bytes.byteLength - 65557) && v.getUint32(fim, true) !== 0x06054b50) fim--;
  if (fim < Math.max(0, bytes.byteLength - 65557)) throw new Error('ZIP incompleto.');
  const n = v.getUint16(fim + 10, true), offset = v.getUint32(fim + 16, true), tamanho = v.getUint32(fim + 12, true);
  if (n > 3000 || !n || n === 65535 || offset + tamanho > fim || v.getUint16(fim + 4, true) || v.getUint16(fim + 6, true)) throw new Error('Formato ZIP não suportado.');
  let p = offset, total = 0; const nomes = new Set<string>();
  for (let i = 0; i < n; i++) {
    if (p + 46 > fim || v.getUint32(p, true) !== 0x02014b50 || (v.getUint16(p + 8, true) & 1)) throw new Error('ZIP inválido ou protegido.');
    const size = v.getUint32(p + 24, true), nomeSize = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comentario = v.getUint16(p + 32, true);
    const nome = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + nomeSize));
    if (p + 46 + nomeSize + extra + comentario > fim || nome.startsWith('/') || nome.includes('\\') || nome.split('/').includes('..') || nomes.has(nome)) throw new Error('Caminho inválido ou repetido no ZIP.');
    nomes.add(nome); total += size;
    if (size > 32 * 1024 * 1024 || (nome.endsWith('.json') && size > 2 * 1024 * 1024) || total > 600 * 1024 * 1024) throw new Error('O conteúdo do ZIP excede os limites da biblioteca.');
    p += 46 + nomeSize + extra + comentario;
  }
  if (p !== offset + tamanho) throw new Error('Diretório ZIP inconsistente.');
}
const registo = z.object({ id: z.number().int(), title: z.string().max(1000), url: z.string().max(2000), tags: z.array(z.string().max(200)).max(100) }).passthrough();
const catalogoSchema = z.object({ versao: z.literal(1), estado: z.enum(['a_descarregar','concluido']), capas: z.number().int().min(0).max(3000), thumbnails: z.array(z.object({ name: z.string().max(500) }).passthrough()).max(3000), projeto: z.string().max(300), exportadoEm: z.string().max(100), entradas: z.array(z.object({ id: z.string(), url: z.string().max(2000), nome: z.string().max(500), registos: z.array(registo).max(100), orfao: z.boolean(), hash: z.string().regex(/^[a-f0-9]{64}$/).optional(), bytes: z.number().int().positive().optional(), erro: z.string().max(3000).optional() })).max(2000), registos: z.number().int().max(2000), objetos: z.number().int().max(2000) }).passthrough();
export async function abrirAcervoZip(f: File) {
  if (f.size > MAX_ZIP) throw new Error('Escolhe o ZIP do acervo até 350 MB.');
  const bytes = await f.arrayBuffer(); conferirZip(bytes);
  const { default: JSZip } = await import('jszip'); const zip = await JSZip.loadAsync(bytes);
  const entrada = zip.file('catalogo.json'); if (!entrada) throw new Error('Falta catalogo.json no ZIP do PDF Tracker.');
  const catalogo = catalogoSchema.parse(JSON.parse(await entrada.async('text'))) as unknown as CatalogoPdfTracker;
  const entradas = documentosLegado(catalogo);
  for (const e of entradas) if (!zip.file(`pdfs/${e.hash}.pdf`)) throw new Error(`O ZIP está incompleto: falta o original de ${e.nome}.`);
  return { catalogo, async ficheiro(hash: string, nome: string) {
    const e = entradas.find(e => e.hash === hash); if (!e) throw new Error('PDF fora do catálogo.');
    const b = await zip.file(`pdfs/${hash}.pdf`)!.async('uint8array');
    const assinatura = [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(n => n.toString(16).padStart(2, '0')).join('');
    if (assinatura !== hash || (e.bytes && e.bytes !== b.length)) throw new Error('A assinatura do PDF não corresponde ao catálogo.');
    return new File([b], nome.endsWith('.pdf') ? nome : `${nome}.pdf`, { type: 'application/pdf' });
  } };
}
