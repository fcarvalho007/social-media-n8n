// Pure sign-in flow (no runtime imports) so it can be unit-tested; index.ts wires real dependencies.
export const PERMITIDOS = ['fredericodigital@gmail.com', 'comunicacao@fredericocarvalho.pt'];
export const MAX_FALHAS_IP = 10;
export const MAX_ENTRADAS_EMAIL = 20;

export interface Dependencias {
  contarFalhasIp(ip: string): Promise<number>;
  contarEntradasEmail(email: string): Promise<number>;
  registar(sucesso: boolean): Promise<void>;
  contaExiste(email: string): Promise<boolean>;
  emitirSessao(email: string): Promise<{ access_token: string; refresh_token: string } | null>;
}

/** causa is internal (logged server-side, never sent): which step failed and whether it timed out. */
export interface Resultado { status: number; body: Record<string, string>; causa?: string }

const MUITAS = { error: 'Demasiadas tentativas. Tenta daqui a 15 minutos.' };
const SEM_ACESSO = { error: 'Este email não tem acesso.' };
const INDISPONIVEL = { error: 'Serviço indisponível. Tenta daqui a um minuto.' };

/** Per-call time limit: an unresponsive auth/database service must fail fast instead of hanging the sign-in. */
export const LIMITE_MS = 15_000;

export class LimiteExpirado extends Error {}

export function comLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const expira = new Promise<never>((_, rej) => { t = setTimeout(() => rej(new LimiteExpirado()), ms); });
  return Promise.race([p, expira]).finally(() => clearTimeout(t));
}

/**
 * Maps any failure to a fixed, non-sensitive class: never the free-text message.
 * Output is one of: tempo_esgotado | http_<3 digits> | pg_<SQLSTATE> | codigo_<snake_case> | rede_<ErrorName> | desconhecida.
 */
export function classificarFalha(e: unknown): string {
  if (e instanceof LimiteExpirado) return 'tempo_esgotado';
  if (!e || typeof e !== 'object') return 'desconhecida';
  const o = e as { status?: unknown; code?: unknown; name?: unknown };
  const partes: string[] = [];
  if (typeof o.status === 'number' && o.status >= 100 && o.status <= 599) partes.push(`http_${o.status}`);
  if (typeof o.code === 'string') {
    if (/^[0-9A-Z]{5}$/.test(o.code)) partes.push(`pg_${o.code}`);
    else if (/^[a-z_]{1,40}$/.test(o.code)) partes.push(`codigo_${o.code}`);
  }
  if (!partes.length && typeof o.name === 'string' && /^[A-Za-z]{1,40}$/.test(o.name) && o.name !== 'Error') partes.push(`rede_${o.name}`);
  return partes.length ? partes.join('+') : 'desconhecida';
}

/** Fixed step log: step name, outcome class and duration only. */
export type RegistoEtapa = (etapa: string, resultado: string, ms: number) => void;

/** Any dependency failure or timeout yields 503; never a fake success, never account data to the visitor. */
export async function entrar(
  emailBruto: unknown, ip: string | null, d: Dependencias, limiteMs = LIMITE_MS, registo: RegistoEtapa = () => {},
): Promise<Resultado> {
  const email = typeof emailBruto === 'string' ? emailBruto.trim().toLowerCase() : '';
  if (!email || email.length > 254) return { status: 400, body: { error: 'Email inválido' } };
  let etapa = 'inicio';
  const L = async <T,>(p: Promise<T>, nome: string): Promise<T> => {
    etapa = nome;
    const t0 = Date.now();
    try {
      const v = await comLimite(p, limiteMs);
      registo(nome, 'ok', Date.now() - t0);
      return v;
    } catch (e) {
      registo(nome, classificarFalha(e), Date.now() - t0);
      throw e;
    }
  };
  try {
    if (ip && (await L(d.contarFalhasIp(ip), 'limite_ip')) >= MAX_FALHAS_IP) return { status: 429, body: MUITAS };
    if (!PERMITIDOS.includes(email)) { await L(d.registar(false), 'registar'); return { status: 403, body: SEM_ACESSO }; }
    if ((await L(d.contarEntradasEmail(email), 'limite_email')) >= MAX_ENTRADAS_EMAIL) return { status: 429, body: MUITAS };
    // Explicit existence check: generateLink would otherwise create the user.
    if (!(await L(d.contaExiste(email), 'conta_existe'))) { await L(d.registar(false), 'registar'); return { status: 403, body: SEM_ACESSO }; }
    const sessao = await L(d.emitirSessao(email), 'emitir_sessao');
    if (!sessao) { await L(d.registar(false), 'registar'); return { status: 500, body: { error: 'Não foi possível entrar. Tenta de novo.' } }; }
    await L(d.registar(true), 'registar');
    return { status: 200, body: sessao };
  } catch (e) {
    // Timeouts are service failures, not user failures: nothing is recorded against the visitor.
    return { status: 503, body: INDISPONIVEL, causa: `${etapa}:${classificarFalha(e)}` };
  }
}
