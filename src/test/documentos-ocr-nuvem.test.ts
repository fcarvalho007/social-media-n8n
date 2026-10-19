// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { encode } from 'fast-png';
import { createHash } from 'node:crypto';
import { DocumentosEdge } from '../../scripts/backend/documentos-edge';
import { PdfNuvem } from '../../scripts/backend/pdf-wasm';
import { supabaseMemoria } from './apoio/supabase-memoria';
import { paginaComOcr, paginasParaOcr } from '../features/documentos/ocr-modelo';
import { validarPreparacaoPdf } from '../../scripts/backend/documentos-preparacao';
const bytes = Buffer.from('%PDF-1.7\noriginal'), hash = createHash('sha256').update(bytes).digest('hex');
const capa = Buffer.from(encode({ width: 2, height: 2, channels: 4, data: new Uint8Array(16).fill(255) })).toString('base64');
const vazio = { n: 1, estado: 'sem_texto_com_imagem' as const, texto: '', paragrafos: [] };
const preparacao = { pdf: { hash, bytes: bytes.length, ficheiro: 'original.pdf', paginas: [vazio] }, capa };
function contexto() { const projeto = crypto.randomUUID(), userId = crypto.randomUUID(), memoria = supabaseMemoria(); const ctx = { projeto, userId, escrever: true, user: memoria.sb }; return { memoria, ctx, docs: new DocumentosEdge(memoria.sb, { parte: vi.fn() } as unknown as PdfNuvem) }; }
describe('importação privada preparada e OCR', () => {
  it('guarda original, texto/capa prontos e evita nova fila e nova extração ao repetir', async () => {
    const { docs, ctx, memoria } = contexto();
    const r = await docs.guardar(ctx, bytes, { titulo: 'Digitalização', preparacao });
    expect(r.documento.dados.pdf.paginas).toHaveLength(1); expect(r.documento.dados.processamento?.estado).toBe('concluido'); expect(memoria.objetos.size).toBe(2); expect(memoria.tabelas.hub_jobs ?? []).toHaveLength(0);
    const repetido = await docs.guardar(ctx, bytes, { titulo: 'Não substituir' });
    expect(repetido.duplicado).toBe(true); expect(repetido.documento.dados.titulo).toBe('Digitalização'); expect(memoria.tabelas.hub_documentos).toHaveLength(1);
  });
  it('recusa preparação de outro ficheiro e limites manipulados antes de guardar binários', async () => {
    const { docs, ctx, memoria } = contexto();
    await expect(docs.guardar(ctx, bytes, { preparacao: { ...preparacao, pdf: { ...preparacao.pdf, hash: 'a'.repeat(64) } } })).rejects.toThrow('não corresponde');
    expect(memoria.objetos.size).toBe(0);
    expect(() => validarPreparacaoPdf({ ...preparacao, capa: Buffer.from('<svg/>').toString('base64') }, hash, bytes.length)).toThrow('PNG');
    expect(() => validarPreparacaoPdf({ ...preparacao, pdf: { ...preparacao.pdf, paginas: [{ ...vazio, n: 2 }] } }, hash, bytes.length)).toThrow('não corresponde');
  });
  it('persiste OCR por página, conserva título/leitura e recusa outro projeto ou original', async () => {
    const { docs, ctx, memoria } = contexto(); const r = await docs.guardar(ctx, bytes, { titulo: 'Meu título', preparacao });
    const id = r.documento.id; const a = { id, hash, pagina: { n: 1, texto: 'GIRASSOL 4827\n\nTexto reconhecido.', confianca: 94 } };
    await docs.alterar(ctx, { id, campo: 'leitura', valor: 'lido', revisao: 1 });
    await expect(docs.operar({ ...ctx, projeto: crypto.randomUUID() }, 'ocr-pagina', a)).rejects.toThrow('não encontrado');
    await expect(docs.operar({ ...ctx, escrever: false }, 'ocr-pagina', a)).rejects.toThrow();
    await expect(docs.operar(ctx, 'ocr-pagina', { ...a, hash: 'b'.repeat(64) })).rejects.toThrow('original');
    await docs.operar(ctx, 'ocr-pagina', a); await docs.operar(ctx, 'ocr-pagina', a);
    const d = memoria.tabelas.hub_documentos[0].dados;
    expect(d).toMatchObject({ titulo: 'Meu título', leitura: 'lido', pdf: { paginas: [{ texto: a.pagina.texto, ocr: { motor: 'tesseract-7', confianca: 94 } }] } });
    await expect(docs.operar(ctx, 'ocr-pagina', { ...a, pagina: { ...a.pagina, texto: 'Substituir' } })).rejects.toThrow('texto existente');
  });
  it('mantém falhas/folhas em branco distintas de texto reconhecido e não repete páginas processadas', () => {
    const p = paginaComOcr(vazio, { n: 1, texto: '', confianca: 0 });
    expect(p.estado).toBe('sem_texto_com_imagem'); expect(paginasParaOcr([p, { ...vazio, n: 2 }])).toHaveLength(1);
    expect(() => paginaComOcr(vazio, { n: 2, texto: 'Errado', confianca: 50 })).toThrow();
    expect(() => paginaComOcr(vazio, { n: 1, texto: 'Errado', confianca: NaN })).toThrow();
  });
});
