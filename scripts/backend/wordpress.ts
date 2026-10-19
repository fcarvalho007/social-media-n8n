import { imagemWordPress, reconciliarImagemWordPress } from './wordpress-imagens';
import { htmlMarkdownArtigo } from '../../src/features/seo/markdownArtigo';
import { Buffer } from 'node:buffer';
import process from 'node:process';
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
    if ((!caminho.startsWith('/wp-json/wp/v2/')&&caminho!=='/wp-json/hub-editorial/v1/capabilities') || caminho.includes('..'))
        throw new Error('Operação WordPress inválida.');
    const u = validarDestino(new URL(caminho, c.url).href), ip = await resolverPublico(u);
    const upload=dados as {ficheiro?:{bytes:Uint8Array;tipo:string;nome:string};campos?:Record<string,string>};let body:Buffer|undefined,contentType='application/json';
    if(upload?.ficheiro){if(caminho!=='/wp-json/wp/v2/media'||method!=='POST'||!/^hub-[a-f0-9]{64}\.(png|jpg|webp)$/.test(upload.ficheiro.nome))throw new Error('Upload WordPress inválido.');const boundary=`hub${crypto.randomUUID().replace(/-/g,'')}`;const campos=Object.entries(upload.campos??{}).map(([k,v])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));body=Buffer.concat([...campos,Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${upload.ficheiro.nome}"\r\nContent-Type: ${upload.ficheiro.tipo}\r\n\r\n`),Buffer.from(upload.ficheiro.bytes),Buffer.from(`\r\n--${boundary}--\r\n`)]);contentType=`multipart/form-data; boundary=${boundary}`;}else body=dados===undefined?undefined:Buffer.from(JSON.stringify(dados));
    return new Promise((resolve, reject) => {
        const r = https.request(u, { method, agent: false, signal: AbortSignal.timeout(45000), timeout: 30000, family: ip.family, lookup: (_h, o, cb) => o.all ? cb(null, [ip]) : cb(null, ip.address, ip.family), headers: { Authorization: `Basic ${Buffer.from(`${c.user}:${c.password}`).toString('base64')}`, Accept: 'application/json', 'Accept-Encoding': 'identity', ...(body ? { 'Content-Type': contentType, 'Content-Length': String(body.length) } : {}) } }, res => {
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
export function htmlArtigo(p: PautaEditorial, marcador: string) {
    if (!p.texto)
        throw new Error('Artigo sem texto.');
    return `${htmlMarkdownArtigo(p.texto.corpo,p.fontes,true)}\n<!-- ${marcador} -->`;
}
export function metadadosConfirmados(post:unknown,p:PautaEditorial){const m=(post as {hub_editorial?:Record<string,unknown>})?.hub_editorial,seo=p.texto?.seo;return !!m&&!!seo&&m.titulo===(seo.titulo||p.texto!.titulo)&&m.descricao===seo.descricao&&m.palavra===p.palavra&&m.schema===seo.schema;}
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
        const pendentes = await this.sb.from('hub_publicacoes').select('id').eq('project_id', job.project_id).eq('pauta_id',p.id).eq('site_id',s.id).in('estado',['reservado','incerto']).limit(1);
        if(pendentes.error || pendentes.data?.length)
            throw new Error('Existe um envio reservado ou incerto deste artigo. Reconcilia antes de mudar a versão ou repetir.');
        if(p.texto?.seo?.enviar){const cap=await this.pedir(c,'/wp-json/hub-editorial/v1/capabilities') as {versao?:number;metadados?:boolean};if(cap?.versao!==1||!cap.metadados)throw new Error('Verifica a ponte Hub Editorial Bridge e a compatibilidade do plugin SEO antes de aplicar os metadados.');}
        let reserva = await this.sb.from('hub_publicacoes').insert({ project_id: job.project_id, pauta_id: p.id, site_id: s.id, versao: p.versao, assinatura, destino: a.destino, estado: 'reservado', escrita_iniciada:false }).select('*').single();
        if (reserva.error) {
            const anterior = await this.sb.from('hub_publicacoes').select('*').eq('project_id', job.project_id).eq('pauta_id', p.id).eq('site_id', s.id).eq('versao', p.versao).eq('destino', a.destino).single();
            if (!anterior.error && anterior.data?.estado === 'enviado' && anterior.data.assinatura === assinatura)
                return { reutilizado: true, id: anterior.data.remoto_id, url: anterior.data.remoto_url };
            if(!anterior.error&&anterior.data?.estado==='falhou'&&anterior.data.escrita_iniciada===false){reserva=await this.sb.from('hub_publicacoes').update({estado:'reservado',assinatura,escrita_iniciada:false,imagem_esperada:null,atualizado_em:new Date().toISOString()}).eq('project_id',job.project_id).eq('id',anterior.data.id).eq('estado','falhou').eq('escrita_iniciada',false).select('*').single();if(reserva.error)throw new Error('O envio mudou. Atualiza antes de repetir.');}
            else throw new Error('Já existe um envio reservado ou incerto desta versão. Reconcilia antes de repetir.');
        }
        const marcador = `hub-artigo:${job.project_id}:${p.id}:${p.versao}:${assinatura}`;
        let postIniciado=false;
        try {
            // The remote identity survives a slug change. Never create a new article
            // merely because its current URL differs from the previous version.
            const anteriores = await this.sb.from('hub_publicacoes').select('*').eq('project_id',job.project_id).eq('pauta_id',p.id).eq('site_id',s.id).eq('estado','enviado').order('versao',{ascending:false}).limit(1);
            if(anteriores.error) throw new Error('Não foi possível verificar o histórico de publicação.');
            const conhecido=anteriores.data?.[0];
            const existentes = conhecido?.remoto_id
                ? [remotoZ.parse(await this.pedir(c,`/wp-json/wp/v2/posts/${conhecido.remoto_id}?context=edit`))]
                : z.array(remotoZ).parse(await this.pedir(c, `/wp-json/wp/v2/posts?context=edit&slug=${encodeURIComponent(p.texto!.slug)}&status=draft,pending,publish,future,private&per_page=10`));
            let caminho = '/wp-json/wp/v2/posts';
            if (existentes.length) {
                if (existentes.length !== 1)
                    throw new Error('Há vários artigos com este slug. É necessária revisão.');
                const post = existentes[0], referencias = await this.sb.from('hub_publicacoes').select('*').eq('project_id', job.project_id).eq('pauta_id', p.id).eq('site_id', s.id).eq('estado', 'enviado').eq('remoto_id', post.id).order('versao', { ascending: false }).limit(1);
                const ref = referencias.data?.[0];
                if(['publish','future','private'].includes(post.status)&&a.destino==='draft')
                    throw new Error('Esta ação retiraria uma versão já publicada ou agendada. Revê a operação no WordPress.');
                if (referencias.error || !ref || !post.modified_gmt || ref.remoto_modificado_em !== post.modified_gmt || !post.content.raw?.includes(`hub-artigo:${job.project_id}:${p.id}:`))
                    throw new Error('Artigo já existente ou alterado no WordPress. Não foi substituído; reconcilia a versão remota.');
                caminho = `/wp-json/wp/v2/posts/${post.id}`;
            }
            const renovada = await this.sb.rpc('hub_lease_renovar', { _projeto: job.project_id, _recurso: 'seo', _token: token });
            const pausaAgora = await this.sb.from('hub_operacao').select('pausado').eq('project_id', job.project_id).single();
            if (renovada.error || renovada.data !== true || pausaAgora.error || pausaAgora.data?.pausado !== false)
                throw new Error('Envio interrompido antes da escrita remota.');
            const featuredMedia=p.texto!.imagem?await imagemWordPress(this.sb,job.project_id,s.id,c,p.texto!.imagem,this.pedir):a.featuredMedia;
            if(featuredMedia!==undefined){const recibo=await this.sb.from('hub_publicacoes').update({imagem_esperada:featuredMedia}).eq('project_id',job.project_id).eq('id',reserva.data.id).eq('estado','reservado').select('id');if(recibo.error||recibo.data?.length!==1)throw new Error('Não foi possível guardar a imagem esperada antes da escrita remota.');}
            const meta=p.texto!.seo?.enviar?{hub_editorial:{titulo:p.texto!.seo.titulo||p.texto!.titulo,descricao:p.texto!.seo.descricao,palavra:p.palavra,schema:p.texto!.seo.schema}}:{};
            const escrita=await this.sb.from('hub_publicacoes').update({escrita_iniciada:true}).eq('project_id',job.project_id).eq('id',reserva.data.id).eq('estado','reservado').select('id');if(escrita.error||escrita.data?.length!==1)throw new Error('Não foi possível reservar a escrita remota.');
            postIniciado=true;
            const post = remotoZ.parse(await this.pedir(c, caminho, 'POST', { title: p.texto!.titulo, content: htmlArtigo(p, marcador), excerpt: p.texto!.resumo, slug: p.texto!.slug, status: a.destino, categories: a.categorias ?? [], tags: a.tags ?? [], ...meta,...(featuredMedia ? { featured_media: featuredMedia } : {}) }));
            if(p.texto!.seo?.enviar&&!metadadosConfirmados(post,p))throw new Error('O WordPress não confirmou os metadados SEO. Confirma o resultado antes de repetir.');
            if(featuredMedia&&(post as unknown as {featured_media?:number}).featured_media!==featuredMedia)throw new Error('O WordPress não confirmou a imagem destacada.');
            if (new URL(post.link).origin !== new URL(c.url).origin || post.status !== a.destino || !post.modified_gmt || post.content.raw?.trim()!==htmlArtigo(p,marcador).trim())
                throw new Error('O estado remoto difere do pedido; verificar o WordPress.');
            const q = await this.sb.from('hub_publicacoes').update({ estado: 'enviado', evento_estado:null, remoto_id: post.id, remoto_url: post.link, remoto_modificado_em: post.modified_gmt ?? null, atualizado_em: new Date().toISOString() }).eq('id', reserva.data.id).eq('estado', 'reservado').select('id');
            if (q.error || q.data?.length !== 1)
                throw new Error('WordPress respondeu, mas o registo local não foi confirmado.');
            return { id: post.id, url: post.link, estado: post.status };
        }
        catch (e) {
            await this.sb.from('hub_publicacoes').update({ estado: postIniciado?'incerto':'falhou', escrita_iniciada:postIniciado, evento_estado:null, atualizado_em: new Date().toISOString() }).eq('id', reserva.data.id).eq('estado', 'reservado');
            throw e;
        }
    }
    async reconciliarImagem(projeto:string,site:string,hash:string){const c=this.credenciais(site);if(!c)throw new Error('Destino sem credenciais.');return reconciliarImagemWordPress(this.sb,projeto,site,hash,c,this.pedir);}
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
        if(envio.estado==='falhou'&&envio.escrita_iniciada===false)return{confirmado:false,detalhe:'A preparação falhou antes de enviar o artigo. Corrige a causa e confirma um novo pedido no editor.'};
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
        const imagemValida=(post:Record<string,unknown>)=>envio.imagem_esperada!=null?post.featured_media===envio.imagem_esperada:!p.texto?.imagem;
        const certos = posts.filter(post => imagemValida(post) && (!p.texto?.seo?.enviar||metadadosConfirmados(post,p)) && post.status === envio.destino && post.modified_gmt && new URL(post.link).origin === new URL(c.url).origin && post.content.raw?.trim() === htmlArtigo(p, marcador).trim());
        if (certos.length !== 1)
            return { confirmado: false, detalhe: 'Não foi encontrado um resultado remoto inequívoco. O envio continua bloqueado; nenhum artigo foi reenviado.' };
        const post = certos[0], q = await this.sb.from('hub_publicacoes').update({ estado: 'enviado', evento_estado:null, remoto_id: post.id, remoto_url: post.link, remoto_modificado_em: post.modified_gmt, atualizado_em: new Date().toISOString() }).eq('project_id', projeto).eq('id', id).eq('estado', envio.estado).select('id');
        if (q.error || q.data?.length !== 1)
            throw new Error('O registo mudou durante a reconciliação. Atualiza o histórico.');
        return { confirmado: true, url: post.link };
    }
}
