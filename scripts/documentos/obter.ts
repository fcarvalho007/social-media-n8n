import { Buffer } from 'node:buffer';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { isIP } from 'node:net';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { ipBloqueado, pareceIp } from '../../supabase/functions/_shared/motor/fontes';

export const MAX_PDF = 50 * 1024 * 1024;
const MAX_HTML = 8 * 1024 * 1024;
export function validarDestino(bruto: string): URL {
  if (typeof bruto !== 'string' || bruto.length > 2000) throw new Error('Endereço inválido.');
  const u = new URL(bruto);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || pareceIp(u.hostname) || !u.hostname.includes('.') || /\.(localhost|local|internal)$/i.test(u.hostname)) throw new Error('Só são permitidos sites públicos por HTTPS, sem credenciais ou portas.');
  u.hash = ''; return u;
}
export type Resolver = (host: string) => Promise<{ address: string; family: number }[]>;
export function ipRecolhaBloqueado(ip: string): boolean {
  const familia = isIP(ip);
  // IPv4-mapped, NAT64, 6to4, Teredo and non-global IPv6 are never connection targets.
  if (!familia || ipBloqueado(ip)) return true;
  if (familia === 6) return !/^[23][0-9a-f]{3}:/i.test(ip) || /^2002:|^2001:0{0,4}:/i.test(ip);
  return false;
}
export async function resolverPublico(url: URL, resolver: Resolver = h => lookup(h, { all: true, verbatim: true })) {
  const ips = await resolver(url.hostname);
  if (!ips.length || ips.some(ip => ipRecolhaBloqueado(ip.address))) throw new Error('O endereço resolve para uma rede privada ou reservada.');
  return ips.find(ip=>ip.family===4)??ips[0];
}

/** DNS is checked at each hop and pinned in lookup; TLS still verifies the original hostname. */
export interface RespostaPublica { bytes: Buffer; tipo: string; url: string; status: number; etag?: string; modificadoEm?: string; xRobotsTag?: string }
export interface OpcoesObter { maxBytes?: number; aceitarErroHttp?: boolean; antesDeVisitar?: (url: URL) => Promise<void> }
export async function obterPublico(bruto: string, signal: AbortSignal, opcoes: OpcoesObter = {}): Promise<RespostaPublica> {
  let u = validarDestino(bruto);
  for (let hop = 0; hop <= 4; hop++) {
    signal.throwIfAborted();
    await opcoes.antesDeVisitar?.(u);
    const ip = await resolverPublico(u);
    signal.throwIfAborted();
    const r = await new Promise<Partial<RespostaPublica> & { redirecionar?: string }>((resolve, reject) => {
      const req = https.get(u, {
        signal, timeout: 10000, agent: false, family: ip.family,
        lookup: (_host, options, cb) => options.all ? cb(null, [ip]) : cb(null, ip.address, ip.family),
        headers: { 'User-Agent': 'HubDocumentos/0.2 (owner-initiated document discovery)', Accept: 'application/pdf,text/html,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.5', 'Accept-Encoding': 'gzip, deflate, br' },
      }, res => {
        const status = res.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(status)) {
          res.resume();
          if (!res.headers.location) { reject(new Error('O site redirecionou sem indicar um destino.')); return; }
          resolve({ redirecionar: new URL(res.headers.location, u).href }); return;
        }
        if (status !== 200 && !opcoes.aceitarErroHttp) { res.resume(); reject(new Error(`O site respondeu HTTP ${status}. Não foi guardado nenhum PDF.`)); return; }
        const tipo = (res.headers['content-type'] ?? '').split(';')[0].toLowerCase();
        const max = opcoes.maxBytes ?? (tipo.includes('html') || tipo.includes('xml') || tipo.includes('text/') ? MAX_HTML : MAX_PDF);
        if (Number(res.headers['content-length']) > max) { res.destroy(); reject(new Error('O ficheiro excede o limite de leitura local.')); return; }
        const encoding = res.headers['content-encoding'];
        const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'br' ? createBrotliDecompress() : encoding === 'deflate' ? createInflate() : null;
        if (encoding && encoding !== 'identity' && !decoder) { res.destroy(); reject(new Error('O site devolveu uma compressão não suportada.')); return; }
        const stream = decoder ? res.pipe(decoder) : res;
        const partes: Buffer[] = []; let total = 0;
        stream.on('data', (chunk: Buffer) => { total += chunk.length; if (total > max) { stream.destroy(new Error('O ficheiro excede o limite de leitura local.')); res.destroy(); } else partes.push(chunk); });
        stream.on('end', () => resolve({ bytes: Buffer.concat(partes), tipo, status, etag: res.headers.etag, modificadoEm: res.headers['last-modified'], xRobotsTag: Array.isArray(res.headers['x-robots-tag']) ? res.headers['x-robots-tag'].join(',') : res.headers['x-robots-tag'] }));
        stream.on('error', e => { res.destroy(); reject(e); });
        res.on('error', reject);
      });
      req.on('timeout', () => req.destroy(new Error('O site demorou demasiado a responder.')));
      req.on('error', reject);
    });
    if (r.redirecionar) { u = validarDestino(r.redirecionar); continue; }
    return { bytes: r.bytes!, tipo: r.tipo!, status: r.status!, url: u.href, etag: r.etag, modificadoEm: r.modificadoEm, xRobotsTag: r.xRobotsTag };
  }
  throw new Error('O site excedeu o limite de redirecionamentos.');
}
