import { supabase } from '@/integrations/supabase/client';
import { getMarca } from '@/services/estudio';
export const MODO_HUB_LOCAL = import.meta.env.DEV && import.meta.env.MODE === 'hub';
export function validarUrlBackend(bruto: string, desenvolvimento = false) {
    const u = new URL(bruto);
    if (u.username || u.password || u.search || u.hash || !['/', '/functions/v1/hub-editorial'].includes(u.pathname) || (u.origin + (u.pathname === '/' ? '' : u.pathname)) !== bruto.replace(/\/$/, ''))
        throw new Error('Configura a origem exata do serviço editorial.');
    if (u.protocol !== 'https:' && !(desenvolvimento && u.protocol === 'http:' && u.hostname === '127.0.0.1'))
        throw new Error('O serviço editorial exige HTTPS.');
    return u.origin + (u.pathname === '/' ? '' : u.pathname);
}
const configurada = import.meta.env.VITE_HUB_BACKEND_URL as string | undefined;
export const BACKEND_HUB_URL = configurada ? validarUrlBackend(configurada, import.meta.env.DEV) : null;
export const BACKEND_NUVEM = !!BACKEND_HUB_URL && !MODO_HUB_LOCAL;
export async function pedidoBackend(caminho: string, corpo: Record<string, unknown> | FormData = {}, opcoes: {
    projeto?: string;
    timeout?: number;
    signal?: AbortSignal;
} = {}): Promise<Response> {
    if (!BACKEND_HUB_URL)
        throw new Error('O serviço editorial ainda não foi configurado.');
    if (!/^\/(?:seo|documentos|operacao|wordpress)\/[a-z/-]+$/.test(caminho))
        throw new Error('Operação editorial inválida.');
    const sessao = await supabase.auth.getSession();
    if (sessao.error || !sessao.data.session)
        throw new Error('Inicia sessão no Hub para continuar.');
    const projeto = opcoes.projeto ?? await getMarca();
    if (!projeto)
        throw new Error('Escolhe um projeto no Hub antes de continuar.');
    const form = corpo instanceof FormData;
    let r: Response;
    try {
        r = await fetch(`${BACKEND_HUB_URL}${caminho}`, { method: 'POST', headers: { Authorization: `Bearer ${sessao.data.session.access_token}`, 'X-Hub-Projeto': projeto, ...(!form ? { 'Content-Type': 'application/json' } : {}) }, body: form ? corpo : JSON.stringify(corpo), signal: AbortSignal.any([AbortSignal.timeout(opcoes.timeout ?? 45000), ...(opcoes.signal ? [opcoes.signal] : [])]), redirect: 'error', credentials: 'omit' });
    }
    catch {
        throw new Error('O serviço editorial não respondeu. Confere o histórico antes de repetir pedidos pagos ou publicações.');
    }
    if (!r.ok) {
        let mensagem = 'Não foi possível concluir a operação no servidor.';
        try {
            const j = await r.json();
            if (typeof j.erro === 'string')
                mensagem = j.erro;
        }
        catch { /* no HTML/proxy error leaked */ }
        throw new Error(mensagem);
    }
    return r;
}
export async function apiBackend<T>(caminho: string, dados: Record<string, unknown> = {}, opcoes: {
    projeto?: string;
    timeout?: number;
    signal?: AbortSignal;
} = {}): Promise<T> {
    const r = await pedidoBackend(caminho, dados, opcoes);
    try {
        return await r.json();
    }
    catch {
        throw new Error('A resposta do serviço editorial está incompleta.');
    }
}
