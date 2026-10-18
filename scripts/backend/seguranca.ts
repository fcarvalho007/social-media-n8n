import { z } from 'zod';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
export const uuid = z.string().uuid();
export class FalhaHttp extends Error {
    constructor(message: string, readonly status = 400) { super(message); }
}
export interface ContextoBackend {
    userId: string;
    projeto: string;
    escrever: boolean;
    user: SupabaseClient;
}
const fetchLimitado: typeof fetch = (url, opcoes: RequestInit = {}) => fetch(url, { ...opcoes, signal: AbortSignal.any([AbortSignal.timeout(120000), ...(opcoes.signal ? [opcoes.signal] : [])]) });
export function clienteServico(url: string, chave: string) { return createClient(url, chave, { global: { fetch: fetchLimitado }, auth: { persistSession: false, autoRefreshToken: false } }); }
export async function autorizar(token: string | undefined, projeto: unknown, url: string, anon: string): Promise<ContextoBackend> {
    if (!token?.startsWith('Bearer ') || token.length > 12000)
        throw new FalhaHttp('Inicia sessão no Hub.', 401);
    const p = uuid.safeParse(projeto);
    if (!p.success)
        throw new FalhaHttp('Escolhe um projeto válido.');
    const user = createClient(url, anon, { global: { headers: { Authorization: token }, fetch: fetchLimitado }, auth: { persistSession: false, autoRefreshToken: false } });
    const r = await user.auth.getUser();
    if (r.error || !r.data.user)
        throw new FalhaHttp('A sessão expirou.', 401);
    const [leitura, escrita] = await Promise.all([user.rpc('mc_pode_ler', { _project_id: p.data }), user.rpc('mc_pode_escrever', { _project_id: p.data })]);
    if (leitura.error || leitura.data !== true || escrita.error)
        throw new FalhaHttp('Sem acesso a este projeto.', 403);
    return { userId: r.data.user.id, projeto: p.data, escrever: escrita.data === true, user };
}
export function exigirEscrita(ctx: ContextoBackend) {
    if (!ctx.escrever)
        throw new FalhaHttp('Esta operação exige permissão de edição.', 403);
}
export function ambitoAutorizado(ctx: ContextoBackend, ambito: unknown) {
    if (ambito !== JSON.stringify([ctx.userId, ctx.projeto]))
        throw new FalhaHttp('O documento não pertence ao contexto atual.', 403);
}
export function origemPermitida(origem: string | undefined, origens: ReadonlySet<string>) { return !!origem && origens.has(origem); }
