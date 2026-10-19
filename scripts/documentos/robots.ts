import { Buffer } from 'node:buffer';
import { obterPublico } from './obter';

interface Regra { permitir: boolean; caminho: string }
interface Grupo { agentes: string[]; regras: Regra[]; teveRegra: boolean }
const normal = (s: string) => encodeURI(s).replace(/%25([0-9a-f]{2})/gi, '%$1').replace(/%([0-9a-f]{2})/gi, (m, hex) => { const c = String.fromCharCode(parseInt(hex,16)); return /[A-Za-z0-9._~-]/.test(c) ? c : m.toUpperCase(); });
export function permitidoRobots(txt: string, url: URL): boolean {
  const grupos: Grupo[] = []; let atual: Grupo | null = null;
  for (const linha of txt.split(/\r?\n/)) {
    const m = linha.split('#')[0].match(/^\s*([^:]+):\s*(.*)$/); if (!m) continue;
    const k = m[1].trim().toLowerCase(); const v = m[2].trim();
    if (k === 'user-agent') { if (!atual || atual.teveRegra) { atual = { agentes: [], regras: [],teveRegra:false }; grupos.push(atual); } atual.agentes.push(v.toLowerCase()); }
    else if (atual && (k === 'allow' || k === 'disallow')) { atual.teveRegra=true;if(v.startsWith('/'))atual.regras.push({ permitir: k === 'allow', caminho: normal(v) }); }
  }
  const proprios = grupos.filter(g => g.agentes.includes('hubdocumentos'));
  const aplicaveis = proprios.length ? proprios : grupos.filter(g => g.agentes.includes('*'));
  const caminho = normal(url.pathname + url.search); let melhor = -1; let permitir = true;
  for (const r of aplicaveis.flatMap(g => g.regras)) {
    const pattern = r.caminho.split('*').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*').replace(/\\\$$/, '$');
    if (!new RegExp(`^${pattern}`).test(caminho)) continue;
    const tamanho = Buffer.byteLength(r.caminho.replace(/[*$]/g, ''));
    if (tamanho > melhor || (tamanho === melhor && r.permitir)) { melhor = tamanho; permitir = r.permitir; }
  }
  return permitir;
}
export class ErroRobots extends Error {}
// Only expose a recognised category; upstream errors may include URLs or credentials.
function diagnosticoConsulta(e: unknown): string {
  const erro = e as { name?: string; code?: string; message?: string; cause?: { code?: string } } | null;
  const codigo = erro?.code ?? erro?.cause?.code;
  if (/blocklisted|not implemented/i.test(erro?.message ?? '')) return 'O ambiente de execução não suporta uma operação de rede necessária.';
  if (erro?.name === 'TimeoutError' || erro?.name === 'AbortError' || codigo === 'ETIMEDOUT') return 'A consulta excedeu o tempo limite.';
  if (codigo === 'ENOTFOUND' || codigo === 'EAI_AGAIN') return 'Não foi possível resolver o domínio da fonte.';
  if (codigo === 'ECONNRESET' || codigo === 'ECONNREFUSED') return 'A ligação à fonte foi interrompida ou recusada.';
  if (codigo === 'CERT_HAS_EXPIRED' || codigo === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || codigo === 'ERR_TLS_CERT_ALTNAME_INVALID') return 'Não foi possível validar o certificado HTTPS da fonte.';
  return 'Falha de rede sem diagnóstico específico; tenta novamente mais tarde.';
}
export class Robots {
  private cache = new Map<string, { valor: Promise<string>; expira: number }>();
  async verificar(url: URL): Promise<void> {
    if (!this.cache.has(url.origin) || this.cache.get(url.origin)!.expira<Date.now()) {
      const item={valor:this.ler(url.origin),expira:Date.now()+24*60*60*1000};
      item.valor.catch(()=>{item.expira=Date.now()+60000;}); this.cache.set(url.origin,item);
    }
    const txt = await this.cache.get(url.origin)!.valor;
    if (!permitidoRobots(txt, url)) throw new ErroRobots('O robots.txt desta fonte não permite esta recolha.');
  }
  private async ler(origem: string): Promise<string> {
    try {
      const r = await obterPublico(`${origem}/robots.txt`, AbortSignal.timeout(10000), { maxBytes: 512000, aceitarErroHttp: true });
      if (r.status === 404 || r.status === 410) return '';
      if (r.status !== 200) throw new ErroRobots(`Não foi possível confirmar o robots.txt (HTTP ${r.status}).`);
      const txt = r.bytes.toString('utf8');
      if (/^\s*<!doctype html|^\s*<html/i.test(txt)) throw new ErroRobots('O robots.txt devolveu uma página HTML; recolha suspensa nesta fonte.');
      return txt;
    } catch (e) { if (e instanceof ErroRobots) throw e; throw new ErroRobots(`Não foi possível consultar o robots.txt. ${diagnosticoConsulta(e)} A recolha permanece suspensa nesta fonte.`); }
  }
}
