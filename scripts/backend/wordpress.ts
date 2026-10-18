import https from 'node:https';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { resolverPublico, validarDestino } from '../documentos/obter';
import { assinaturaPauta } from '../seo/editorial';
import { triagemPublicacao, exigeRevisao } from '../../src/features/seo/politicas';
import type { EstadoSeo, PautaEditorial } from '../../src/features/seo/contratos';
import type { JobHub } from './worker';
export interface CredencialWp {
    url: string;
    user: string;
    password: string;
}
const DOMINIOS: Record<string, string> = { sms: 'smsonline.pt', teletrabalho: 'teletrabalhoweb.com', digitalfc: 'digitalfc.pt', frederico: 'fredericocarvalho.pt', digitalsprint: 'digitalsprint.pt', academia: 'academiamarketing.pt', certificacao: 'certificacaomarketing.pt', auditoria: 'auditoriaseo.pt' };
export function credencialWordPress(site: string, env: Record<string, string | undefined> = process.env): CredencialWp | null {
    const dominio = DOMINIOS[site];
    if (!dominio)
        return null;
    const prefixo = `HUB_WP_${site.toUpperCase()}`;
    const url = env[`${prefixo}_URL`] ?? (site === 'frederico' ? env.WORDPRESS_SITE_URL : site === 'digitalsprint' ? env.DIGITALSPRINT_WP_URL : undefined);
    const user = env[`${prefixo}_USER`] ?? (site === 'frederico' ? env.wordpress_site_username : site === 'digitalsprint' ? env.DIGITALSPRINT_WP_USER : undefined);
    const password = env[`${prefixo}_PASSWORD`] ?? (site === 'frederico' ? env.wordpress_site_key : site === 'digitalsprint' ? env.DIGITALSPRINT_WP_APP_PASSWORD : undefined);
    if (!url || !user || !password)
        return null;
    const u = validarDestino(url);
    if (u.hostname.replace(/^www\./, '') !== dominio || u.search || u.pathname !== '/')
        throw new Error('A credencial WordPress não corresponde ao domínio do destino.');
    if (/[\r\n:]/.test(user) || /[\r\n]/.test(password))
        throw new Error('Credencial WordPress inválida.');
    return { url: u.origin, user, password };
}
export async function pedidoWordPress(c: CredencialWp, caminho: string, method: 'GET' | 'POST' = 'GET', dados?: unknown): Promise<unknown> {
    if (!caminho.startsWith('/wp-json/wp/v2/') || caminho.includes('..'))
        throw new Error('Operação WordPress inválida.');
    const u = validarDestino(new URL(caminho, c.url).href), ip = await resolverPublico(u), body = dados === undefined ? undefined : Buffer.from(JSON.stringify(dados));
    return new Promise((resolve, reject) => {
        const r = https.request(u, { method, agent: false, signal: AbortSignal.timeout(45000), timeout: 30000, family: ip.family, lookup: (_h, o, cb) => o.all ? cb(null, [ip]) : cb(null, ip.address, ip.family), headers: { Authorization: `Basic ${Buffer.from(`${c.user}:${c.password}`).toString('base64')}`, Accept: 'application/json', 'Accept-Encoding': 'identity', ...(body ? { 'Content-Type': 'application/json', 'Content-Length': String(body.length) } : {}) } }, res => {
            // Authentication never follows redirects to another host or path.
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                res.resume();
                reject(new Error(`WordPress respondeu HTTP ${res.statusCode ?? 0}. Confere o resultado antes de repetir.`));
                return;
            }
            const chunks: Buffer[] = [];
            let n = 0;
            res.on('data', (b: Buffer) => {
                n += b.length;
                if (n > 8 * 1024 * 1024)
                    res.destroy(new Error('Resposta WordPress demasiado grande.'));
                else
                    chunks.push(b);
            });
            res.on('error', reject);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                }
                catch {
                    reject(new Error('Resposta WordPress inválida.'));
                }
            });
        });
        r.on('error', reject);
        r.on('timeout', () => r.destroy(new Error('WordPress não respondeu a tempo; confirmar antes de repetir.')));
        r.end(body);
    });
}
const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export function htmlArtigo(p: PautaEditorial, marcador: string) {
    if (!p.texto)
        throw new Error('Artigo sem texto.');
    const fonte = (s: string) => {
        const re = /\[fonte:([^\]]+)\]|\[([^\]]{1,300})\]\((https:\/\/[^\s)]+)\)|\*\*([^*]{1,500})\*\*/g;
        let out = '', cursor = 0;
        for (const m of s.matchAll(re)) {
            out += escapar(s.slice(cursor, m.index));
            cursor = m.index! + m[0].length;
            if (m[1]) {
                const f = p.fontes.find(f => f.id === m[1] && f.aprovada);
                if (!f)
                    throw new Error('Fonte desconhecida no artigo.');
                const u = new URL(f.url);
                if (u.protocol !== 'https:' || u.username || u.password)
                    throw new Error('Fonte inválida.');
                out += `<a href="${escapar(u.href)}" rel="noopener noreferrer">${escapar(f.titulo)}</a>`;
            }
            else if (m[2]) {
                const u = new URL(m[3]);
                if (u.username || u.password)
                    throw new Error('Ligação inválida.');
                out += `<a href="${escapar(u.href)}" rel="noopener noreferrer">${escapar(m[2])}</a>`;
            }
            else
                out += `<strong>${escapar(m[4])}</strong>`;
        }
        return out + escapar(s.slice(cursor));
    };
    const partes = p.texto.corpo.split(/\n\s*\n/).filter(x => x.trim()).map(t => {
        const h = t.match(/^(#{1,4})\s+([^\n]+)$/);
        if (h)
            return `<h${Math.max(2, h[1].length)}>${fonte(h[2])}</h${Math.max(2, h[1].length)}>`;
        const linhas = t.split('\n');
        if (linhas.every(l => /^[-*]\s+/.test(l)))
            return `<ul>${linhas.map(l => `<li>${fonte(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
        return `<p>${fonte(t).replace(/\n/g, '<br>')}</p>`;
    });
    return `${partes.join('\n')}\n<!-- ${marcador} -->`;
}
const remotoZ = z.object({ id: z.number().int().positive(), link: z.string().url(), status: z.string(), modified_gmt: z.string().max(50).optional(), content: z.object({ raw: z.string().optional(), rendered: z.string().optional() }) }).passthrough();
export class PublicadorWordPress {
    constructor(private sb: SupabaseClient, private credenciais: (site: string) => CredencialWp | null, private permitirPublicar: () => boolean, private pedir: typeof pedidoWordPress = pedidoWordPress) { }
    async executar(job: JobHub) {
        const lease = await this.sb.rpc('hub_lease_reservar', { _projeto: job.project_id, _recurso: 'seo', _segundos: 180 });
        if (lease.error || !lease.data)
            throw new Error('O projeto está a concluir outra operação. Nenhum pedido WordPress foi enviado.');
        try {
            return await this.executarReservado(job, String(lease.data));
        }
        finally {
            await this.sb.rpc('hub_lease_libertar', { _projeto: job.project_id, _recurso: 'seo', _token: lease.data });
        }
    }
    private async executarReservado(job: JobHub, token: string) {
        const a = z.object({ pautaId: z.string().uuid(), versao: z.number().int().positive(), destino: z.enum(['draft', 'publish']), confirmar: z.literal(true), userId: z.string().uuid().optional(), featuredMedia: z.number().int().nonnegative().optional(), categorias: z.array(z.number().int().positive()).max(30).optional(), tags: z.array(z.number().int().positive()).max(30).optional() }).strict().parse(job.pedido);
        const e = await this.sb.from('hub_editorial_estados').select('dados').eq('project_id', job.project_id).single();
        if (e.error || !e.data)
            throw new Error('Plano editorial indisponível.');
        const estado = e.data.dados as EstadoSeo, p = estado.pautas.find(p => p.id === a.pautaId), s = p && estado.sites.find(s => s.id === p.siteId);
        if (!p || !s || p.versao !== a.versao || s.estado !== 'piloto')
            throw new Error('Artigo/destino alterado ou ainda planeado.');
        const assinatura = assinaturaPauta(p, s), aprovada = p.aprovacao?.assinatura === assinatura && p.aprovacao.versao === p.versao;
        const bloqueios = triagemPublicacao(p, s);
        if (bloqueios.length)
            throw new Error(bloqueios.join(' '));
        if (a.destino === 'publish') {
            if (!this.permitirPublicar())
                throw new Error('Publicação externa está desligada no servidor.');
            if ((exigeRevisao(p, s) || s.id === 'frederico' || s.dominio === 'fredericocarvalho.pt') && !aprovada)
                throw new Error('Falta aprovação humana da versão atual.');
            if (!aprovada && (s.politica.publicacao !== 'automatica' || p.estado !== 'pronto_automatico'))
                throw new Error('O artigo não está autorizado para publicação.');
        }
        const c = this.credenciais(s.id);
        if (!c || new URL(c.url).hostname.replace(/^www\./, '') !== s.dominio)
            throw new Error('WordPress não configurado para este destino.');
        const pausa = await this.sb.from('hub_operacao').select('pausado').eq('project_id', job.project_id).single();
        if (pausa.error || pausa.data?.pausado !== false)
            throw new Error('Publicação pausada antes do envio.');
        const reserva = await this.sb.from('hub_publicacoes').insert({ project_id: job.project_id, pauta_id: p.id, site_id: s.id, versao: p.versao, assinatura, destino: a.destino, estado: 'reservado' }).select('*').single();
        if (reserva.error) {
            const anterior = await this.sb.from('hub_publicacoes').select('*').eq('project_id', job.project_id).eq('pauta_id', p.id).eq('site_id', s.id).eq('versao', p.versao).eq('destino', a.destino).single();
            if (!anterior.error && anterior.data?.estado === 'enviado' && anterior.data.assinatura === assinatura)
                return { reutilizado: true, id: anterior.data.remoto_id, url: anterior.data.remoto_url };
            throw new Error('Já existe um envio reservado ou incerto desta versão. Reconcilia antes de repetir.');
        }
        const marcador = `hub-artigo:${job.project_id}:${p.id}:${p.versao}:${assinatura}`;
        try {
            const existentes = z.array(remotoZ).parse(await this.pedir(c, `/wp-json/wp/v2/posts?context=edit&slug=${encodeURIComponent(p.texto!.slug)}&status=draft,pending,publish,future,private&per_page=10`));
            let caminho = '/wp-json/wp/v2/posts';
            if (existentes.length) {
                if (existentes.length !== 1)
                    throw new Error('Há vários artigos com este slug. É necessária revisão.');
                const post = existentes[0], referencias = await this.sb.from('hub_publicacoes').select('*').eq('project_id', job.project_id).eq('pauta_id', p.id).eq('site_id', s.id).eq('estado', 'enviado').eq('remoto_id', post.id).order('versao', { ascending: false }).limit(1);
                const ref = referencias.data?.[0];
                if (referencias.error || !ref || !post.modified_gmt || ref.remoto_modificado_em !== post.modified_gmt || !post.content.raw?.includes(`hub-artigo:${job.project_id}:${p.id}:`))
                    throw new Error('Artigo já existente ou alterado no WordPress. Não foi substituído; reconcilia a versão remota.');
                caminho = `/wp-json/wp/v2/posts/${post.id}`;
            }
            const renovada = await this.sb.rpc('hub_lease_renovar', { _projeto: job.project_id, _recurso: 'seo', _token: token });
            const pausaAgora = await this.sb.from('hub_operacao').select('pausado').eq('project_id', job.project_id).single();
            if (renovada.error || renovada.data !== true || pausaAgora.error || pausaAgora.data?.pausado !== false)
                throw new Error('Envio interrompido antes da escrita remota.');
            const post = remotoZ.parse(await this.pedir(c, caminho, 'POST', { title: p.texto!.titulo, content: htmlArtigo(p, marcador), excerpt: p.texto!.resumo, slug: p.texto!.slug, status: a.destino, categories: a.categorias ?? [], tags: a.tags ?? [], ...(a.featuredMedia ? { featured_media: a.featuredMedia } : {}) }));
            if (new URL(post.link).origin !== new URL(c.url).origin || post.status !== a.destino)
                throw new Error('O estado remoto difere do pedido; verificar o WordPress.');
            const q = await this.sb.from('hub_publicacoes').update({ estado: 'enviado', remoto_id: post.id, remoto_url: post.link, remoto_modificado_em: post.modified_gmt ?? null, atualizado_em: new Date().toISOString() }).eq('id', reserva.data.id).eq('estado', 'reservado').select('id');
            if (q.error || q.data?.length !== 1)
                throw new Error('WordPress respondeu, mas o registo local não foi confirmado.');
            return { id: post.id, url: post.link, estado: post.status };
        }
        catch (e) {
            await this.sb.from('hub_publicacoes').update({ estado: 'incerto', atualizado_em: new Date().toISOString() }).eq('id', reserva.data.id).eq('estado', 'reservado');
            throw e;
        }
    }
    async verificar(site: string) {
        const c = this.credenciais(site);
        if (!c)
            throw new Error('Destino sem credenciais.');
        const r = await this.pedir(c, '/wp-json/wp/v2/users/me?context=edit') as {
            id?: number;
        };
        if (!r.id)
            throw new Error('WordPress não confirmou o utilizador.');
        return { site, autenticado: true, verificadoEm: new Date().toISOString() };
    }
    async reconciliar(projeto: string, id: string) {
        z.string().uuid().parse(id);
        const r = await this.sb.from('hub_publicacoes').select('*').eq('project_id', projeto).eq('id', id).single();
        if (r.error || !r.data)
            throw new Error('Envio não encontrado neste projeto.');
        const envio = r.data;
        if (envio.estado === 'enviado')
            return { confirmado: true, url: envio.remoto_url };
        const e = await this.sb.from('hub_editorial_estados').select('dados').eq('project_id', projeto).single();
        const estado = e.data?.dados as EstadoSeo | undefined, p = estado?.pautas.find(p => p.id === envio.pauta_id), s = p && estado?.sites.find(s => s.id === p.siteId);
        if (e.error || !p || !s || p.versao !== envio.versao || assinaturaPauta(p, s) !== envio.assinatura)
            throw new Error('A versão local mudou. Confere este envio diretamente no WordPress antes de preparar outro.');
        const c = this.credenciais(s.id);
        if (!c)
            throw new Error('Destino sem credenciais.');
        const posts = z.array(remotoZ).parse(await this.pedir(c, `/wp-json/wp/v2/posts?context=edit&slug=${encodeURIComponent(p.texto!.slug)}&status=draft,pending,publish,future,private&per_page=10`));
        const marcador = `hub-artigo:${projeto}:${p.id}:${p.versao}:${envio.assinatura}`;
        const certos = posts.filter(post => post.status === envio.destino && post.modified_gmt && new URL(post.link).origin === new URL(c.url).origin && post.content.raw?.trim() === htmlArtigo(p, marcador).trim());
        if (certos.length !== 1)
            return { confirmado: false, detalhe: 'Não foi encontrado um resultado remoto inequívoco. O envio continua bloqueado; nenhum artigo foi reenviado.' };
        const post = certos[0], q = await this.sb.from('hub_publicacoes').update({ estado: 'enviado', remoto_id: post.id, remoto_url: post.link, remoto_modificado_em: post.modified_gmt, atualizado_em: new Date().toISOString() }).eq('project_id', projeto).eq('id', id).eq('estado', envio.estado).select('id');
        if (q.error || q.data?.length !== 1)
            throw new Error('O registo mudou durante a reconciliação. Atualiza o histórico.');
        return { confirmado: true, url: post.link };
    }
}
