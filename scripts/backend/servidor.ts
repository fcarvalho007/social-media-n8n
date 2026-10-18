import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { autorizar, ambitoAutorizado, exigirEscrita, FalhaHttp, origemPermitida, type ContextoBackend } from './seguranca';
import { ServicoSeo } from './seo';
import { DocumentosNuvem } from './documentos';
import { PublicadorWordPress } from './wordpress';
import { guardarBackup } from './backup';
export interface ConfigBackend {
    url: string;
    anon: string;
    origens: Set<string>;
    pasta: string;
}
export interface ServicosBackend {
    sb: SupabaseClient;
    seo: ServicoSeo;
    documentos: DocumentosNuvem;
    wordpress: PublicadorWordPress;
    autorizar?: typeof autorizar;
}
async function lerCorpo(req: IncomingMessage, limite: number) {
    const partes: Buffer[] = [];
    let total = 0;
    for await (const c of req) {
        const b = Buffer.isBuffer(c) ? c : Buffer.from(c);
        total += b.length;
        if (total > limite)
            throw new FalhaHttp('O ficheiro ou pedido excede o limite permitido.', 413);
        partes.push(b);
    }
    return Buffer.concat(partes);
}
export function criarServidor(config: ConfigBackend, servicos: ServicosBackend) {
    const limites = new Map<string, {
        fim: number;
        n: number;
    }>();
    const json = (res: ServerResponse, dados: unknown, status = 200) => {
        if (!res.destroyed) {
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(dados ?? null));
        }
    };
    return createServer(async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (req.method === 'GET' && req.url === '/health') {
            json(res, { processo: 'ativo', versao: 1 });
            return;
        }
        const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
        if (!origemPermitida(origin, config.origens)) {
            json(res, { erro: 'Origem não autorizada.' }, 403);
            return;
        }
        res.setHeader('Access-Control-Allow-Origin', origin!);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-hub-projeto');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        if (req.method !== 'POST') {
            json(res, { erro: 'Método não permitido.' }, 405);
            return;
        }
        let libertar: (() => Promise<void>) | undefined;
        try {
            const caminho = new URL(req.url ?? '/', 'http://backend.invalid').pathname.match(/^\/(seo|documentos|operacao|wordpress)\/(.+)$/);
            if (!caminho)
                throw new FalhaHttp('Operação desconhecida.', 404);
            const ctx = await (servicos.autorizar ?? autorizar)(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined, req.headers['x-hub-projeto'], config.url, config.anon);
            const agora = Date.now(), limite = limites.get(ctx.userId);
            if (limite && limite.fim > agora && ++limite.n > 120)
                throw new FalhaHttp('Demasiados pedidos. Aguarda um minuto.', 429);
            if (!limite || limite.fim <= agora)
                limites.set(ctx.userId, { fim: agora + 60000, n: 1 });
            if (limites.size > 1000)
                for (const [k, v] of limites)
                    if (v.fim <= agora)
                        limites.delete(k);
            const leitura = { seo: ['estado', 'resultado', 'ciclo'], documentos: ['capas', 'documento', 'versoes', 'acervo', 'recolhas', 'encontrar', 'ficheiro', 'fontes', 'diagnostico', 'legado/catalogo', 'tarefas', 'ler'], operacao: ['estado'], wordpress: ['verificar', 'estado'] } as Record<string, string[]>;
            if (!leitura[caminho[1]].includes(caminho[2]) && !(caminho[1] === 'operacao' && caminho[2] === 'backup')) {
                const copia = await servicos.sb.from('hub_leases').select('token').eq('project_id', ctx.projeto).eq('recurso', 'backup').gt('ate', new Date().toISOString()).maybeSingle();
                if (copia.error)
                    throw new Error('Não foi possível confirmar a disponibilidade para escrita.');
                if (copia.data)
                    throw new FalhaHttp('Está a ser criada uma cópia consistente. Aguarda antes de editar.', 409);
            }
            if (caminho[1] === 'documentos' && !leitura.documentos.includes(caminho[2])) {
                exigirEscrita(ctx);
                const lease = await servicos.sb.rpc('hub_lease_reservar', { _projeto: ctx.projeto, _recurso: 'documentos', _segundos: 600 });
                if (lease.error || !lease.data)
                    throw new FalhaHttp('Já existe uma edição ou cópia de documentos neste projeto. Aguarda antes de repetir.', 409);
                const timer = setInterval(() => { void Promise.resolve(servicos.sb.rpc('hub_lease_renovar', { _projeto: ctx.projeto, _recurso: 'documentos', _token: lease.data })).catch(() => { }); }, 30000);
                timer.unref();
                libertar = async () => { clearInterval(timer); await servicos.sb.rpc('hub_lease_libertar', { _projeto: ctx.projeto, _recurso: 'documentos', _token: lease.data }); };
            }
            const tipo = req.headers['content-type'] ?? '';
            if (caminho[1] === 'documentos' && caminho[2] === 'guardar') {
                exigirEscrita(ctx);
                if (!tipo.startsWith('multipart/form-data'))
                    throw new FalhaHttp('Carrega um ficheiro PDF.');
                const partes = await new Response(await lerCorpo(req, 55 * 1024 * 1024), { headers: { 'Content-Type': tipo } }).formData();
                const pdf = partes.get('pdf');
                if (!(pdf instanceof File))
                    throw new FalhaHttp('Ficheiro PDF em falta.');
                const meta = JSON.parse(String(partes.get('metadados') ?? '{}')) as Record<string, unknown>;
                json(res, await servicos.documentos.guardar(ctx, new Uint8Array(await pdf.arrayBuffer()), { ...meta, ficheiro: pdf.name }));
                return;
            }
            if (!tipo.startsWith('application/json'))
                throw new FalhaHttp('Pedido JSON obrigatório.', 415);
            const a = JSON.parse((await lerCorpo(req, 400000)).toString('utf8') || '{}') as Record<string, unknown>;
            if (!a || typeof a !== 'object' || Array.isArray(a))
                throw new FalhaHttp('Pedido inválido.');
            let resultado: unknown;
            if (caminho[1] === 'seo')
                resultado = await servicos.seo.executar(ctx, caminho[2], a);
            else if (caminho[1] === 'documentos') {
                if (a.ambito !== undefined)
                    ambitoAutorizado(ctx, a.ambito);
                resultado = await servicos.documentos.operar(ctx, caminho[2], a);
                if (resultado instanceof Blob) {
                    res.setHeader('Content-Type', resultado.type || 'application/octet-stream');
                    res.end(Buffer.from(await resultado.arrayBuffer()));
                    return;
                }
                if (caminho[2] === 'obter') {
                    const r = resultado as {
                        bytes: Buffer;
                        tipo: string;
                        url: string;
                    };
                    res.setHeader('Content-Type', r.tipo);
                    res.setHeader('X-Hub-Url-Final', encodeURIComponent(r.url));
                    res.setHeader('Access-Control-Expose-Headers', 'X-Hub-Url-Final');
                    res.end(r.bytes);
                    return;
                }
            }
            else if (caminho[1] === 'operacao')
                resultado = await operarServico(servicos.sb, ctx, caminho[2], a);
            else {
                if (caminho[2] === 'estado') {
                    const id = z.string().uuid().parse(a.pautaId);
                    const [p, j] = await Promise.all([servicos.sb.from('hub_publicacoes').select('id,versao,destino,estado,remoto_url,atualizado_em').eq('project_id', ctx.projeto).eq('pauta_id', id).order('atualizado_em', { ascending: false }).limit(20), servicos.sb.from('hub_jobs').select('id,estado,resultado,pedido,criado_em').eq('project_id', ctx.projeto).eq('tipo', 'wordpress').contains('pedido', { pautaId: id }).order('criado_em', { ascending: false }).limit(10)]);
                    if (p.error || j.error)
                        throw new Error('Não foi possível consultar os envios WordPress.');
                    resultado = { envios: p.data, trabalhos: j.data, podeEditar: ctx.escrever, publicacaoAtiva: process.env.HUB_WORDPRESS_PUBLICAR === '1' };
                }
                else {
                    exigirEscrita(ctx);
                    if (caminho[2] === 'verificar')
                        resultado = await servicos.wordpress.verificar(z.string().max(80).parse(a.siteId));
                    else if (caminho[2] === 'reconciliar')
                        resultado = await servicos.wordpress.reconciliar(ctx.projeto, z.string().uuid().parse(a.id));
                    else if (caminho[2] === 'enfileirar') {
                        if (a.confirmar !== true)
                            throw new FalhaHttp('Confirma a criação/publicação desta versão.');
                        const r = await ctx.user.rpc('hub_enfileirar', { _projeto: ctx.projeto, _tipo: 'wordpress', _dedup: z.string().uuid().parse(a.pedidoId), _pedido: { pautaId: a.pautaId, versao: a.versao, destino: a.destino, confirmar: true, ...(a.featuredMedia ? { featuredMedia: a.featuredMedia } : {}), ...(a.categorias ? { categorias: a.categorias } : {}), ...(a.tags ? { tags: a.tags } : {}) } });
                        if (r.error)
                            throw new Error('Não foi possível enfileirar a publicação.');
                        resultado = { id: r.data };
                    }
                    else
                        throw new FalhaHttp('Operação WordPress desconhecida.', 404);
                }
            }
            json(res, resultado);
        }
        catch (e) {
            const status = e instanceof FalhaHttp ? e.status : e instanceof z.ZodError || e instanceof SyntaxError ? 400 : 422;
            json(res, { erro: e instanceof z.ZodError ? 'Confere os campos do pedido.' : e instanceof Error ? e.message : 'Não foi possível concluir o pedido.' }, status);
        }
        finally {
            await libertar?.();
        }
    });
}
async function operarServico(sb: SupabaseClient, ctx: ContextoBackend, acao: string, a: Record<string, unknown>) {
    if (acao === 'estado') {
        const [o, j] = await Promise.all([sb.from('hub_operacao').select('pausado,agenda_documentos,atualizado_em').eq('project_id', ctx.projeto).maybeSingle(), sb.from('hub_jobs').select('id,tipo,estado,criado_em,atualizado_em,resultado').eq('project_id', ctx.projeto).order('criado_em', { ascending: false }).limit(30)]);
        if (o.error || j.error)
            throw new Error('O backend ainda não está instalado ou está indisponível.');
        return { operacao: o.data ?? { pausado: true }, trabalhos: j.data, podeEditar: ctx.escrever };
    }
    exigirEscrita(ctx);
    if (acao === 'agenda') {
        const agenda = z.object({ ativa: z.boolean(), dias: z.array(z.number().int().min(0).max(6)).min(1).max(7), hora: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/) }).strict().parse(a.agenda);
        const r = await ctx.user.rpc('hub_agenda_documentos_definir', { _projeto: ctx.projeto, _agenda: agenda });
        if (r.error)
            throw new Error('Não foi possível guardar a recolha periódica.');
        return { ok: true };
    }
    if (acao === 'pausar' || acao === 'retomar') {
        if (acao === 'retomar' && a.confirmar !== true)
            throw new FalhaHttp('Confirma a retoma do processamento.');
        const r = await ctx.user.rpc('hub_operacao_definir', { _projeto: ctx.projeto, _pausado: acao === 'pausar' });
        if (r.error)
            throw new FalhaHttp('Sem permissão para alterar a operação.', 403);
        return { pausado: acao === 'pausar' };
    }
    if (acao === 'backup') {
        const r = await sb.from('hub_operacao').select('pausado').eq('project_id', ctx.projeto).maybeSingle();
        if (r.error || r.data?.pausado !== true)
            throw new FalhaHttp('Pausa os trabalhos antes de criar uma cópia.');
        return guardarBackup(sb, ctx.projeto);
    }
    throw new FalhaHttp('Operação de serviço desconhecida.', 404);
}
