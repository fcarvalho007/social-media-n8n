// @vitest-environment node
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IncomingMessage } from 'node:http';
import type { LookupAddress } from 'node:dns';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { gzipSync,brotliCompressSync } from 'node:zlib';
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('node:https', () => ({ default: { get: vi.fn() } }));
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { obterPublico } from '../../scripts/documentos/obter';
const dnsMock = vi.mocked(lookup) as unknown as Mock<(host: string, options: unknown) => Promise<LookupAddress[]>>;

function resposta(status: number, headers: Record<string, string>, body: Uint8Array = Buffer.from('conteudo')) {
  vi.mocked(https.get).mockImplementationOnce(((_url, _opts, cb) => {
    const req = new EventEmitter() as EventEmitter & { destroy: (e?: Error) => void };
    req.destroy = e => { if (e) req.emit('error', e); };
    queueMicrotask(() => {
      const res = Readable.from([body]);
      Object.assign(res, { statusCode: status, headers }); cb(res as unknown as IncomingMessage);
    });
    return req;
  }) as typeof https.get);
}
beforeEach(() => { vi.resetAllMocks(); dnsMock.mockResolvedValue([{ address: '1.1.1.1', family: 4 }]); });

describe('download: execução do percurso HTTP sem fornecedores externos', () => {
  it.each([['gzip',gzipSync],['br',brotliCompressSync]] as const)('descomprime %s antes de verificar os bytes do PDF',async(encoding,comprimir)=>{
    const bytes=Buffer.from('%PDF-1.7\ntexto');resposta(200,{'content-type':'application/pdf','content-encoding':encoding},comprimir(bytes));
    expect((await obterPublico('https://example.org/download',AbortSignal.timeout(1000))).bytes).toEqual(bytes);
  });
  it('GET sem extensão, bytes preservados e DNS fixo em ambos os modos lookup', async () => {
    const bytes = Buffer.from('%PDF-1.7\nconteudo comprimido'); resposta(200, { 'content-type': 'application/octet-stream' }, bytes);
    const r = await obterPublico('https://example.org/download?id=4', AbortSignal.timeout(1000));
    expect(r.bytes).toEqual(bytes); expect(r.url).toContain('download?id=4');
    const opts = vi.mocked(https.get).mock.calls[0][1] as https.RequestOptions;
    const cb = vi.fn(); opts.lookup!('example.org', { all: true }, cb); expect(cb).toHaveBeenLastCalledWith(null, [{ address: '1.1.1.1', family: 4 }]);
    opts.lookup!('example.org', {}, cb); expect(cb).toHaveBeenLastCalledWith(null, '1.1.1.1', 4);
    expect(opts.headers).not.toHaveProperty('Cookie'); expect(opts.headers).not.toHaveProperty('Authorization');
  });
  it('revalida DNS no redirecionamento e recusa uma resposta privada antes do segundo GET', async () => {
    resposta(302, { location: 'https://redirect.example.org/file' });
    dnsMock.mockResolvedValueOnce([{ address: '1.1.1.1', family: 4 }]).mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    await expect(obterPublico('https://example.org', AbortSignal.timeout(1000))).rejects.toThrow('privada');
    expect(https.get).toHaveBeenCalledTimes(1);
  });
  it('recusa redirecionamento para HTTP sem o visitar', async () => {
    resposta(302, { location: 'http://example.org/file.pdf' });
    await expect(obterPublico('https://example.org', AbortSignal.timeout(1000))).rejects.toThrow('HTTPS'); expect(https.get).toHaveBeenCalledTimes(1);
  });
  it('não converte HTTP 403 numa lista vazia ou PDF válido', async () => {
    resposta(403, { 'content-type': 'text/html' });
    await expect(obterPublico('https://example.org/a.pdf', AbortSignal.timeout(1000))).rejects.toThrow('HTTP 403');
  });
  it('limita bytes reais mesmo sem Content-Length', async () => {
    resposta(200, { 'content-type': 'text/html' }, Buffer.alloc(2 * 1024 * 1024 + 1));
    await expect(obterPublico('https://example.org', AbortSignal.timeout(1000), { maxBytes: 2 * 1024 * 1024 })).rejects.toThrow('limite');
  });
  it('redirecionamento relativo preserva destino final e faz nova validação', async () => {
    resposta(302, { location: '/download?id=1' }); resposta(200, { 'content-type': 'application/pdf' });
    expect((await obterPublico('https://example.org/publicacoes/', AbortSignal.timeout(1000))).url).toBe('https://example.org/download?id=1');
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});
