// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { Robots } from '../../scripts/documentos/robots';
import { obterPublico } from '../../scripts/documentos/obter';

vi.mock('../../scripts/documentos/obter', () => ({ obterPublico: vi.fn() }));
afterEach(() => vi.resetAllMocks());

it.each([
  [new Error('Deno.connect is blocklisted'), 'ambiente de execução'],
  [Object.assign(new Error('private diagnostic'), { code: 'ENOTFOUND' }), 'resolver o domínio'],
  [new DOMException('aborted', 'TimeoutError'), 'tempo limite'],
  [Object.assign(new Error('private diagnostic'), { code: 'ECONNRESET' }), 'interrompida ou recusada'],
  [Object.assign(new Error('private diagnostic'), { code: 'CERT_HAS_EXPIRED' }), 'certificado HTTPS'],
  [new Error('https://user:secret@example.com/private?token=123'), 'sem diagnóstico específico'],
])('suspende a recolha e explica falhas sem expor dados do erro: %s', async (erro, motivo) => {
  vi.mocked(obterPublico).mockRejectedValue(erro);
  const p = new Robots().verificar(new URL('https://example.org/reports'));
  await expect(p).rejects.toThrow(String(motivo));
  await expect(p).rejects.toThrow('recolha permanece suspensa');
  await expect(p).rejects.not.toThrow(/secret|token=|private diagnostic/);
});

it('distingue rejeição HTTP de um erro de rede e não autoriza a fonte', async () => {
  vi.mocked(obterPublico).mockResolvedValue({ status: 403, bytes: Buffer.alloc(0), url: 'https://example.org/robots.txt', tipo: 'text/plain' });
  await expect(new Robots().verificar(new URL('https://example.org/reports'))).rejects.toThrow('HTTP 403');
});
