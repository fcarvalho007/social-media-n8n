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

export interface Resultado { status: number; body: Record<string, string> }

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

/** Any dependency failure or timeout yields 503; never a fake success, never account data to the visitor. */
export async function entrar(emailBruto: unknown, ip: string | null, d: Dependencias, limiteMs = LIMITE_MS): Promise<Resultado> {
  const email = typeof emailBruto === 'string' ? emailBruto.trim().toLowerCase() : '';
  if (!email || email.length > 254) return { status: 400, body: { error: 'Email inválido' } };
  const L = <T,>(p: Promise<T>) => comLimite(p, limiteMs);
  try {
    if (ip && (await L(d.contarFalhasIp(ip))) >= MAX_FALHAS_IP) return { status: 429, body: MUITAS };
    if (!PERMITIDOS.includes(email)) { await L(d.registar(false)); return { status: 403, body: SEM_ACESSO }; }
    if ((await L(d.contarEntradasEmail(email))) >= MAX_ENTRADAS_EMAIL) return { status: 429, body: MUITAS };
    // Explicit existence check: generateLink would otherwise create the user.
    if (!(await L(d.contaExiste(email)))) { await L(d.registar(false)); return { status: 403, body: SEM_ACESSO }; }
    const sessao = await L(d.emitirSessao(email));
    if (!sessao) { await L(d.registar(false)); return { status: 500, body: { error: 'Não foi possível entrar. Tenta de novo.' } }; }
    await L(d.registar(true));
    return { status: 200, body: sessao };
  } catch {
    // Timeouts are service failures, not user failures: nothing is recorded against the visitor.
    return { status: 503, body: INDISPONIVEL };
  }
}
