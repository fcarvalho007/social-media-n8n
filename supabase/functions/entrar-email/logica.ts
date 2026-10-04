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
const INDISPONIVEL = { error: 'Serviço indisponível. Tenta de novo.' };

/** Any dependency failure yields 503; never a fake success, never account data to the visitor. */
export async function entrar(emailBruto: unknown, ip: string | null, d: Dependencias): Promise<Resultado> {
  const email = typeof emailBruto === 'string' ? emailBruto.trim().toLowerCase() : '';
  if (!email || email.length > 254) return { status: 400, body: { error: 'Email inválido' } };
  try {
    if (ip && (await d.contarFalhasIp(ip)) >= MAX_FALHAS_IP) return { status: 429, body: MUITAS };
    if (!PERMITIDOS.includes(email)) { await d.registar(false); return { status: 403, body: SEM_ACESSO }; }
    if ((await d.contarEntradasEmail(email)) >= MAX_ENTRADAS_EMAIL) return { status: 429, body: MUITAS };
    // Explicit existence check: generateLink would otherwise create the user.
    if (!(await d.contaExiste(email))) { await d.registar(false); return { status: 403, body: SEM_ACESSO }; }
    const sessao = await d.emitirSessao(email);
    if (!sessao) { await d.registar(false); return { status: 500, body: { error: 'Não foi possível entrar. Tenta de novo.' } }; }
    await d.registar(true);
    return { status: 200, body: sessao };
  } catch {
    return { status: 503, body: INDISPONIVEL };
  }
}
