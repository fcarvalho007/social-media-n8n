// @vitest-environment node
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, it, expect, vi } from 'vitest';
import { criarServidor, type ServicosBackend } from '../../scripts/backend/servidor';
import { FalhaHttp, type ContextoBackend } from '../../scripts/backend/seguranca';
import { supabaseMemoria } from './apoio/supabase-memoria';
const projeto = '00000000-0000-4000-8000-000000000001', user = '00000000-0000-4000-8000-000000000002';
async function chamar({ origem = 'https://hub.example', metodo = 'POST', url = '/seo/estado', corpo = '{}', tipo = 'application/json', autenticado = true, editor = true, privado = false, libertacaoLenta = false } = {}) {
    const mem = supabaseMemoria({ hub_leases: privado ? [{ project_id: projeto, recurso: 'backup', ate: '2999-01-01', token: 'lease' }] : [] });
    let libertada = false;
    const rpc = mem.sb.rpc.bind(mem.sb);
    mem.sb.rpc = (async (nome: string, args: Record<string, unknown>) => { if (nome === 'hub_lease_libertar') { if (libertacaoLenta) await new Promise(r => setTimeout(r, 30)); libertada = true; } return rpc(nome, args); }) as typeof mem.sb.rpc;
    const operar = vi.fn(async () => ({ ok: true })), autorizar = vi.fn(async () => {
        if (!autenticado)
            throw new FalhaHttp('Sessão expirada.', 401);
        return { projeto, userId: user, escrever: editor, user: mem.sb } as ContextoBackend;
    });
    const servicos = { sb: mem.sb, seo: { executar: operar }, documentos: { operar }, wordpress: { verificar: operar }, autorizar } as unknown as ServicosBackend;
    const servidor = criarServidor({ url: 'https://backend.example', anon: 'anon-teste', origens: new Set(['https://hub.example']), pasta: '/tmp/teste' }, servicos);
    const req = Object.assign(Readable.from([Buffer.from(corpo)]), { method: metodo, url, headers: { origin: origem, authorization: 'Bearer teste', 'x-hub-projeto': projeto, 'content-type': tipo } }) as unknown as IncomingMessage;
    const headers: Record<string, unknown> = {};
    let status = 200;
    let acabar!: (v: {
        status: number;
        body: string;
        headers: Record<string, unknown>;
    }) => void;
    const fim = new Promise<{
        status: number;
        body: string;
        headers: Record<string, unknown>;
    }>(r => acabar = r);
    const res = { destroyed: false, setHeader: (k: string, v: unknown) => { headers[k] = v; }, writeHead: (s: number, h: Record<string, unknown> = {}) => { status = s; Object.assign(headers, h); }, end: (b?: unknown) => acabar({ status, body: b === undefined ? '' : String(b), headers }) } as unknown as ServerResponse;
    servidor.emit('request', req, res);
    return { ...await fim, operar, autorizar, libertada };
}
describe('serviço HTTP autenticado', () => {
    it('liberta a reserva antes de responder, permitindo a próxima gravação sem corrida', async () => { const r = await chamar({ url: '/documentos/legado-relatorio', libertacaoLenta: true }); expect(r.status).toBe(200); expect(r.libertada).toBe(true); });
    it('recusa origem estranha antes de tocar em autenticação ou dados', async () => { const r = await chamar({ origem: 'https://outro.example' }); expect(r.status).toBe(403); expect(r.autorizar).not.toHaveBeenCalled(); expect(r.operar).not.toHaveBeenCalled(); expect(r.headers['Access-Control-Allow-Origin']).toBeUndefined(); });
    it('recusa uma sessão inválida sem chegar ao motor', async () => { const r = await chamar({ autenticado: false }); expect(r.status).toBe(401); expect(r.operar).not.toHaveBeenCalled(); });
    it('faz preflight apenas para origens explicitamente configuradas', async () => { const r = await chamar({ metodo: 'OPTIONS' }); expect(r.status).toBe(204); expect(r.headers['Access-Control-Allow-Origin']).toBe('https://hub.example'); expect(r.autorizar).not.toHaveBeenCalled(); });
    it('não executa operações por GET', async () => { const r = await chamar({ metodo: 'GET' }); expect(r.status).toBe(405); expect(r.operar).not.toHaveBeenCalled(); });
    it('aceita uma leitura autenticada com projeto e sem guardar cookies', async () => { const r = await chamar(); expect(r.status).toBe(200); expect(r.operar).toHaveBeenCalledOnce(); expect(r.headers['Cache-Control']).toBe('no-store'); expect(r.headers['Access-Control-Allow-Credentials']).toBeUndefined(); });
    it.each(['/operacao/percurso','/operacao/pesquisa'])('recusa leitura transversal anónima em %s antes de tocar em conteúdo', async url => { const r = await chamar({ url, autenticado: false, corpo: '{"consulta":"marketing"}' }); expect(r.status).toBe(401); expect(r.operar).not.toHaveBeenCalled(); });
    it('o percurso é apenas leitura mesmo durante backup e com permissão de leitor', async () => { const r = await chamar({ url: '/operacao/percurso', privado: true, editor: false }); expect(r.status).toBe(200); expect(JSON.parse(r.body)).toHaveProperty('percursos'); expect(r.operar).not.toHaveBeenCalled(); });
    it('mantém o snapshot consistente enquanto há um backup', async () => { const r = await chamar({ url: '/seo/pauta', privado: true }); expect(r.status).toBe(409); expect(r.operar).not.toHaveBeenCalled(); });
    it('recusa JSON inválido ou um corpo excessivo antes de executar', async () => {
        for (const corpo of ['[]', '{', 'x'.repeat(400001)]) {
            const r = await chamar({ corpo });
            expect([400, 413]).toContain(r.status);
            expect(r.operar).not.toHaveBeenCalled();
        }
    });
    it('não aceita um upload num pedido sem permissão de escrita', async () => { const r = await chamar({ url: '/documentos/guardar', editor: false }); expect(r.status).toBe(403); expect(r.operar).not.toHaveBeenCalled(); });
});
