// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
vi.mock('node:fs/promises', async original => {
  const fs = await original<typeof import('node:fs/promises')>();
  return { ...fs, rename: vi.fn(async () => { throw new Error('Deno.rename is blocklisted'); }), writeFile: vi.fn(async (...args: Parameters<typeof fs.writeFile>) => {
    if (typeof args[2] === 'object' && args[2]?.mode) throw new Error('Deno.chmod is blocklisted');
    return fs.writeFile(...args);
  }) };
});
import { MotorDocumentos } from '../../scripts/documentos/motor-local';
it('grava checkpoints no /tmp isolado sem pedir chmod ou rename ao ambiente Cloud', async () => {
  const pasta = await mkdtemp(path.join(tmpdir(), 'hub-collect-edge-'));
  try {
    const fonte = { id: 1, name: 'Fonte inválida de teste', url: 'http://example.org', alternative_urls: [], group_category: '', region: '', priority: '', active: false, tags: [], display_order: 1 };
    const motor = new MotorDocumentos(pasta, [fonte], () => true, { temporarioIsolado: true });
    const j = await motor.iniciar('projeto', [1], 'diagnostico'); const fim = await motor.aguardar(j.id, 'projeto');
    expect(fim.estado).toBe('concluida'); expect(fim.fontes[0].estado).toBe('bloqueada');
    const reaberto = new MotorDocumentos(pasta, [fonte], () => true, { temporarioIsolado: true });
    expect((await reaberto.listar('projeto'))[0].id).toBe(j.id);
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
