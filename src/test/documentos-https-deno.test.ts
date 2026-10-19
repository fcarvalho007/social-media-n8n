// @vitest-environment node
import { Buffer } from 'node:buffer';
import { gzipSync } from 'node:zlib';
import { afterEach, expect, it, vi } from 'vitest';
import { httpsDeno, type RedeDeno } from '../../scripts/documentos/https-deno';
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
import { lookup } from 'node:dns/promises';
import { obterPublico } from '../../scripts/documentos/obter';

function rede(bruto: string | Buffer, fragmento = 7) {
  const raw = Buffer.from(bruto); let pos = 0; const enviado: Buffer[] = [];
  const c = { read: vi.fn(async (b: Uint8Array) => { if (pos === raw.length) return null; const n = Math.min(fragmento, b.length, raw.length - pos); b.set(raw.subarray(pos, pos + n)); pos += n; return n; }), write: vi.fn(async (b: Uint8Array) => { const n = Math.min(11, b.length); enviado.push(Buffer.from(b.subarray(0, n))); return n; }), close: vi.fn() };
  const d: RedeDeno = { connect: vi.fn(async () => c), startTls: vi.fn(async () => c) };
  return { d, c, pedido: () => Buffer.concat(enviado).toString() };
}
const url = new URL('https://example.org/reports?q=1');
const run = (d: RedeDeno, max = 1024, maxTexto?: number) => httpsDeno(url, '1.1.1.1', AbortSignal.timeout(1000), max, d, maxTexto);
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });

it('liga só ao IP validado, mantém TLS/SNI e Host originais e não envia credenciais', async () => {
  const { d, c, pedido } = rede('HTTP/1.1 200 OK\r\nContent-Type: application/pdf\r\nContent-Length: 8\r\n\r\n%PDF-1.7');
  expect((await run(d)).bytes.toString()).toBe('%PDF-1.7');
  expect(d.connect).toHaveBeenCalledWith({ hostname: '1.1.1.1', port: 443 });
  expect(d.startTls).toHaveBeenCalledWith(c, { hostname: 'example.org' });
  expect(pedido()).toMatch(/^GET \/reports\?q=1 HTTP\/1.1\r\nHost: example.org\r\n/);
  expect(pedido()).toContain('Connection: close'); expect(pedido()).not.toMatch(/Authorization|Cookie/); expect(c.close).toHaveBeenCalled();
});
it('lê chunked fragmentado, extensões, trailers e resposta intercalar', async () => {
  const { d } = rede('HTTP/1.1 103 Early Hints\r\nLink: </a>\r\n\r\nHTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n4;ok=yes\r\n%PDF\r\n4\r\n-1.7\r\n0\r\nChecksum: abc\r\n\r\n', 1);
  expect((await run(d)).bytes.toString()).toBe('%PDF-1.7');
});
it('lê corpo delimitado pelo fecho da ligação', async () => { expect((await run(rede('HTTP/1.0 200 OK\r\n\r\ntexto').d)).bytes.toString()).toBe('texto'); });
it('descomprime mesmo quando a fonte ignora Accept-Encoding identity', async () => {
  const b = gzipSync('texto português'); const { d } = rede(Buffer.concat([Buffer.from(`HTTP/1.1 200 OK\r\nContent-Length: ${b.length}\r\nContent-Encoding: gzip\r\n\r\n`), b]));
  expect((await run(d)).bytes.toString()).toBe('texto português');
});
it.each([
  'Content-Length: 1\r\nContent-Length: 1',
  'Content-Length: 1\r\nTransfer-Encoding: chunked',
  'Transfer-Encoding: unknown',
  'Content-Length: -2',
  'Bad header: value',
])('rejeita enquadramento ambíguo ou inválido: %s', async h => { await expect(run(rede(`HTTP/1.1 200 OK\r\n${h}\r\n\r\nx`).d)).rejects.toThrow('HTTP inválida'); });
it.each(['Content-Length: 8\r\n\r\nshort', 'Transfer-Encoding: chunked\r\n\r\n2\r\na', 'Transfer-Encoding: chunked\r\n\r\nx\r\n'])('recusa corpo truncado/inválido: %s', async h => { await expect(run(rede(`HTTP/1.1 200 OK\r\n${h}`).d)).rejects.toThrow('HTTP inválida'); });
it('aplica limites a bytes de rede, texto e descompressão', async () => {
  await expect(run(rede('HTTP/1.1 200 OK\r\n\r\n123456').d, 5)).rejects.toThrow('limite');
  await expect(run(rede('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 10\r\n\r\n0123456789').d, 100, 5)).rejects.toThrow('limite');
  const b = gzipSync('a'.repeat(5000)); await expect(run(rede(Buffer.concat([Buffer.from('HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\n\r\n'), b])).d, 100)).rejects.toThrow('limite');
});
it('recusa cabeçalhos excessivos e fecha a ligação', async () => { const { d, c } = rede(`HTTP/1.1 200 OK\r\nX: ${'a'.repeat(8200)}\r\n\r\n`, 16384); await expect(run(d)).rejects.toThrow('HTTP inválida'); expect(c.close).toHaveBeenCalled(); });
it('não lê corpos de redirecionamento nem ignora uma falha TLS', async () => {
  const { d, c } = rede('HTTP/1.1 302 Found\r\nLocation: /file.pdf\r\nContent-Length: 99999999\r\n\r\n'); expect((await run(d)).status).toBe(302); expect(c.close).toHaveBeenCalled();
  vi.mocked(d.startTls).mockRejectedValueOnce(new Error('certificate invalid')); await expect(run(d)).rejects.toThrow('certificate invalid'); expect(d.startTls).toHaveBeenCalledTimes(2);
});
it('cancela uma leitura bloqueada e fecha a ligação', async () => {
  const { d, c } = rede(''); c.read.mockImplementation(() => new Promise(() => {})); const abort = new AbortController();
  const p = httpsDeno(url, '1.1.1.1', abort.signal, 100, d); await vi.waitFor(() => expect(c.read).toHaveBeenCalled()); abort.abort(); await expect(p).rejects.toThrow(); expect(c.close).toHaveBeenCalled();
});
it('na via Deno revalida DNS e robots em cada redirect, sem chamar uma rede privada', async () => {
  const { d } = rede('HTTP/1.1 302 Found\r\nLocation: https://redirect.example.org/file.pdf\r\n\r\n'); vi.stubGlobal('Deno', d);
  vi.mocked(lookup).mockResolvedValueOnce([{ address: '1.1.1.1', family: 4 }] as never).mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }] as never);
  const verificar = vi.fn(async () => {}); await expect(obterPublico(url.href, AbortSignal.timeout(1000), { antesDeVisitar: verificar })).rejects.toThrow('privada'); expect(d.connect).toHaveBeenCalledTimes(1); expect(verificar).toHaveBeenCalledTimes(2);
});
