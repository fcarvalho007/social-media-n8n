import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';

interface Ligacao {
  read(b: Uint8Array): Promise<number | null>;
  write(b: Uint8Array): Promise<number>;
  close(): void;
}
export interface RedeDeno {
  connect(o: { hostname: string; port: number }): Promise<Ligacao>;
  startTls(c: Ligacao, o: { hostname: string }): Promise<Ligacao>;
}
export const redeDeno = () => (globalThis as unknown as { Deno?: RedeDeno }).Deno;
export interface RespostaDeno { status: number; headers: Record<string, string>; bytes: Buffer }
export interface PedidoDeno { method?: 'GET' | 'POST'; headers?: Record<string, string>; body?: Uint8Array; timeoutMs?: number; soStatus?: boolean }
const erroFormato = () => new Error('A fonte devolveu uma resposta HTTP inválida.');
const fechar = (c?: Ligacao) => { try { c?.close(); } catch { /* Already closed after cancellation. */ } };

/** Edge 1.77 cannot use node:https lookup. Connect only to the checked IP;
 * startTls keeps SNI and certificate verification on the original hostname.
 * HTTP/1.1 only, one request per connection, no pooled or implicit redirects. */
export async function httpsDeno(url: URL, ip: string, signal: AbortSignal, maxBytes: number, deno: RedeDeno, maxTexto?: number, opcoes: PedidoDeno = {}): Promise<RespostaDeno> {
  signal.throwIfAborted();
  const limite = AbortSignal.any([signal, AbortSignal.timeout(opcoes.timeoutMs ?? 10000)]);
  let conn: Ligacao | undefined;
  const cancelar = () => fechar(conn);
  limite.addEventListener('abort', cancelar, { once: true });
  async function esperar<T>(p: Promise<T>, abandonar?: (v: T) => void): Promise<T> {
    let abortar: () => void = () => {};
    try {
      limite.throwIfAborted();
      return await Promise.race([p.then(v => { if (limite.aborted) { abandonar?.(v); limite.throwIfAborted(); } return v; }), new Promise<never>((_, reject) => {
        abortar = () => reject(limite.reason); limite.addEventListener('abort', abortar, { once: true });
        if (limite.aborted) abortar();
      })]);
    } finally { limite.removeEventListener('abort', abortar); }
  }
  try {
    conn = await esperar(deno.connect({ hostname: ip, port: 443 }), fechar);
    conn = await esperar(deno.startTls(conn, { hostname: url.hostname }), fechar);
    const h: Record<string, string> = { 'user-agent': 'HubDocumentos/0.2 (owner-initiated document discovery)', accept: 'application/pdf,text/html,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.5', 'accept-encoding': 'identity' };
    for (const [k, v] of Object.entries(opcoes.headers ?? {})) {
      if (!/^[!#$%&'*+.^_`|~\w-]+$/.test(k) || /[\r\n]/.test(v) || !/^[\t\u0020-\u007e\u0080-\u00ff]*$/.test(v) || /^(host|connection|transfer-encoding|content-length|upgrade|expect|proxy-authorization)$/i.test(k)) throw new Error('Cabeçalho de integração inválido.');
      h[k.toLowerCase()] = v;
    }
    if (opcoes.body && opcoes.body.length > 16 * 1024 * 1024) throw new Error('O pedido excede o limite de envio.');
    const prefixo = Buffer.from(`${opcoes.method ?? 'GET'} ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.hostname}\r\n${Object.entries(h).map(([k, v]) => `${k}: ${v}\r\n`).join('')}${opcoes.body ? `Content-Length: ${opcoes.body.length}\r\n` : ''}Connection: close\r\n\r\n`);
    const request = opcoes.body ? Buffer.concat([prefixo, opcoes.body]) : prefixo;
    for (let pos = 0; pos < request.length;) {
      const n = await esperar(conn.write(request.subarray(pos))); if (n <= 0) throw erroFormato(); pos += n;
    }
    let pendente = Buffer.alloc(0); let fim = false;
    const ler = async () => {
      const b = Buffer.alloc(16384); const n = await esperar(conn!.read(b));
      if (n === null) { fim = true; return; } if (n <= 0) throw erroFormato();
      pendente = Buffer.concat([pendente, b.subarray(0, n)]);
    };
    async function linha(max: number): Promise<string> {
      for (;;) {
        const i = pendente.indexOf('\r\n');
        if (i >= 0) { if (i > max) throw erroFormato(); const s = pendente.subarray(0, i).toString('latin1'); pendente = pendente.subarray(i + 2); return s; }
        // A CR may arrive before its LF, including the empty line after a chunk.
        if (pendente.length > max + 1 || fim) throw erroFormato(); await ler();
      }
    }
    let status = 0; let headers: Record<string, string> = Object.create(null);
    for (let interim = 0; interim < 6; interim++) {
      const primeira = await linha(8192); const m = /^HTTP\/1\.[01] ([1-5]\d\d)(?: [^\r\n]*)?$/.exec(primeira);
      if (!m) throw erroFormato(); status = Number(m[1]); headers = Object.create(null);
      let total = primeira.length;
      for (;;) {
        const s = await linha(8192); total += s.length + 2; if (total > 65536) throw erroFormato(); if (!s) break;
        const h = /^([!#$%&'*+.^_`|~\w-]+):[ \t]*([\t\u0020-\u007e\u0080-\u00ff]*)$/.exec(s); if (!h) throw erroFormato();
        const k = h[1].toLowerCase(); const v = h[2].trim();
        if (k in headers && ['content-length', 'transfer-encoding', 'content-encoding', 'location'].includes(k)) throw erroFormato();
        headers[k] = k in headers ? `${headers[k]},${v}` : v;
      }
      if (status >= 200) break;
      if (![100, 102, 103].includes(status) || interim === 5) throw erroFormato();
    }
    // Redirect/error bodies are irrelevant and may be unbounded. Closing cancels them.
    if (status < 200 || status >= 300 || status === 204 || opcoes.soStatus) return { status, headers, bytes: Buffer.alloc(0) };
    if (maxTexto && /html|xml|text\//i.test(headers['content-type'] ?? '')) maxBytes = Math.min(maxBytes, maxTexto);
    const cl = headers['content-length']; const te = headers['transfer-encoding'];
    if ((cl && !/^\d+$/.test(cl)) || (cl && te) || (te && te.toLowerCase() !== 'chunked')) throw erroFormato();
    if (cl && (!Number.isSafeInteger(Number(cl)) || Number(cl) > maxBytes)) throw new Error('O ficheiro excede o limite de leitura local.');
    let recebidos = 0;
    async function* exatamente(n: number): AsyncGenerator<Buffer> {
      while (n > 0) {
        if (!pendente.length) { if (fim) throw erroFormato(); await ler(); continue; }
        const t = Math.min(n, pendente.length); const parte = pendente.subarray(0, t); pendente = pendente.subarray(t); n -= t;
        recebidos += t; if (recebidos > maxBytes) throw new Error('O ficheiro excede o limite de leitura local.'); yield parte;
      }
    }
    async function* corpo(): AsyncGenerator<Buffer> {
      if (te) {
        for (;;) {
          const s = await linha(8192); if (!/^[\da-f]+(?:;[\u0020-\u007e\u0080-\u00ff]*)?$/i.test(s)) throw erroFormato();
          const n = parseInt(s.split(';')[0], 16); if (!Number.isSafeInteger(n) || n > maxBytes - recebidos) throw new Error('O ficheiro excede o limite de leitura local.');
          if (!n) { let tamanho = 0; for (;;) { const trailer = await linha(8192); tamanho += trailer.length + 2; if (tamanho > 65536) throw erroFormato(); if (!trailer) return; if (!/^[!#$%&'*+.^_`|~\w-]+:[\t\u0020-\u007e\u0080-\u00ff]*$/.test(trailer)) throw erroFormato(); } }
          yield* exatamente(n); if (await linha(0) !== '') throw erroFormato();
        }
      } else if (cl) { yield* exatamente(Number(cl)); }
      else { for (;;) { if (pendente.length) yield* exatamente(pendente.length); if (fim) return; await ler(); } }
    }
    const encoding = headers['content-encoding']?.toLowerCase();
    const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'br' ? createBrotliDecompress() : encoding === 'deflate' ? createInflate() : null;
    if (encoding && encoding !== 'identity' && !decoder) throw new Error('O site devolveu uma compressão não suportada.');
    const source = Readable.from(corpo()); const stream = decoder ? source.pipe(decoder) : source;
    // pipe does not forward input failures to the decoder automatically.
    source.on('error', e => decoder?.destroy(e));
    const partes: Buffer[] = []; let tamanho = 0;
    try { for await (const parte of stream) { const b = Buffer.from(parte); tamanho += b.length; if (tamanho > maxBytes) throw new Error('O ficheiro excede o limite de leitura local.'); partes.push(b); } }
    finally { source.destroy(); decoder?.destroy(); }
    return { status, headers, bytes: Buffer.concat(partes) };
  } finally { limite.removeEventListener('abort', cancelar); fechar(conn); }
}
