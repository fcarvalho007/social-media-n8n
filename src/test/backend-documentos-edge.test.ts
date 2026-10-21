// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { DocumentosEdge } from '../../scripts/backend/documentos-edge';
import { PdfNuvem } from '../../scripts/backend/pdf-wasm';
import { supabaseMemoria } from './apoio/supabase-memoria';
import type { JobHub } from '../../scripts/backend/worker';
import type { ContextoBackend } from '../../scripts/backend/seguranca';
it('mantém o total inicial de fontes depois de guardar uma continuação', async () => {
    const projeto = crypto.randomUUID(), userId = crypto.randomUUID();
    const m = supabaseMemoria({ hub_jobs: [{ id: crypto.randomUUID(), project_id: projeto, tipo: 'documentos_recolha', estado: 'fila', pedido: { ids: [3], modo: 'recolher' }, resultado: { total: 3, fontes: [{ fonteId: 1 }, { fonteId: 2 }] } }] });
    const docs = new DocumentosEdge(m.sb, {} as PdfNuvem);
    const tarefas = await docs.operar({ projeto, userId, escrever: true, user: m.sb }, 'tarefas', {}) as { total: number; fontes: unknown[] }[];
    expect(tarefas[0].total).toBe(3);
    expect(tarefas[0].fontes).toHaveLength(2);
});
it('preserva o original antes da extração, continua por páginas e mantém o estado de leitura', async () => { const projeto = crypto.randomUUID(), userId = crypto.randomUUID(), m = supabaseMemoria({ hub_operacao: [{ project_id: projeto, pausado: false }] }), ctx: ContextoBackend = { projeto, userId, escrever: true, user: m.sb }; const parser = { parte: vi.fn(async (_b, _n, inicio) => ({ pdf: { hash: 'h', bytes: 12, ficheiro: 'x.pdf', paginas: [{ n: inicio + 1, estado: 'texto', texto: `Página ${inicio + 1}`, paragrafos: [`Página ${inicio + 1}`] }] }, capa: inicio === 0 ? new Uint8Array([137, 80, 78, 71]) : null, total: 2, proxima: inicio === 0 ? 1 : null })) } as unknown as PdfNuvem; const doc = new DocumentosEdge(m.sb, parser), guardado = await doc.guardar(ctx, Buffer.from('%PDF-1.7\noriginal'), { titulo: 'Relatório', ficheiro: 'x.pdf' }); expect(guardado.documento.dados.pdf.paginas).toEqual([]); expect(m.objetos.size).toBe(1); const id = guardado.documento.id; await doc.parte({ id: crypto.randomUUID(), project_id: projeto, tipo: 'documento_preparar', pedido: { documentoId: id, inicio: 0 }, lease_token: 'token' }); const d = m.tabelas.hub_documentos[0]; (d.dados as Record<string, unknown>).leitura = 'lido'; await doc.parte({ id: crypto.randomUUID(), project_id: projeto, tipo: 'documento_preparar', pedido: { documentoId: id, inicio: 1 }, lease_token: 'token' } as JobHub); expect(d.dados).toMatchObject({ leitura: 'lido', pdf: { paginas: [{ n: 1 }, { n: 2 }] }, processamento: { estado: 'concluido', paginas: 2, total: 2 } }); expect(m.tabelas.hub_jobs).toHaveLength(3); });
