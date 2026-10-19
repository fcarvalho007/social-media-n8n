// @vitest-environment node
import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DocumentosNuvem } from '../../scripts/backend/documentos';
import type { ContextoBackend } from '../../scripts/backend/seguranca';

const ctx = { projeto: 'projeto-a', userId: 'conta-a' } as ContextoBackend;
const rows = Array.from({ length: 31 }, (_, i) => ({ id: String(i).padStart(5, '0'), capa_path: null, revisao: 1, dados: { pdf: { paginas: [{ texto: `texto preservado ${i}` }] } } }));
function backend(falhas: { code: string }[] = []) {
  const pedidos: { projeto?: string; apos?: string; limite?: number; campos?: string }[] = [];
  const sb = { from: vi.fn((tabela: string) => {
    expect(tabela).toBe('hub_documentos'); const p: typeof pedidos[number] = {}; pedidos.push(p);
    const q = { select: (s: string) => { p.campos = s; return q; }, eq: (k: string, s: string) => { expect(k).toBe('project_id'); p.projeto = s; return q; }, order: (k: string) => { expect(k).toBe('id'); return q; }, limit: (n: number) => { p.limite = n; return q; }, gt: (k: string, s: string) => { expect(k).toBe('id'); p.apos = s; return q; }, then: (resolve: (v: unknown) => unknown) => Promise.resolve(falhas.length ? { error: falhas.shift(), data: null } : { error: null, data: rows.filter(r => !p.apos || r.id > p.apos).slice(0, p.limite) }).then(resolve) };
    return q;
  }) } as unknown as SupabaseClient;
  return { service: new DocumentosNuvem(sb, '/tmp'), pedidos };
}
it('lê o acervo completo por lotes pequenos com contexto e cursor, preservando texto e identidade', async () => {
  const { service, pedidos } = backend(); const result = await service.listar(ctx, 'documentos');
  expect(result).toEqual(rows); expect(pedidos).toHaveLength(4); expect(pedidos.every(p => p.limite === 8 && p.projeto === ctx.projeto)).toBe(true);
  expect(pedidos.map(p => p.apos)).toEqual([undefined, '00007', '00015', '00023']); expect(pedidos[0].campos).not.toContain('pdf_path');
});
it('reduz o lote após timeout SQL e conserva todas as páginas, sem duplicar ou devolver sucesso parcial', async () => {
  const { service, pedidos } = backend([{ code: '57014' }]); expect(await service.listar(ctx, 'documentos')).toEqual(rows);
  expect(pedidos.slice(0, 2).map(p => p.limite)).toEqual([8, 4]); expect(pedidos[1].apos).toBeUndefined();
});
it.each(['42501', 'XX000'])('não esconde falhas de permissão/base de dados: %s', async code => { const { service, pedidos } = backend([{ code }]); await expect(service.listar(ctx, 'documentos')).rejects.toThrow('Não foi possível ler'); expect(pedidos).toHaveLength(1); });
it('um documento que continua a exceder o timeout falha explicitamente, sem ciclo infinito', async () => { const { service, pedidos } = backend(Array.from({ length: 4 }, () => ({ code: '57014' }))); await expect(service.listar(ctx, 'documentos')).rejects.toThrow('Não foi possível ler'); expect(pedidos.map(p => p.limite)).toEqual([8, 4, 2, 1]); });
