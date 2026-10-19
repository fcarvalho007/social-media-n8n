import { clienteServico } from './seguranca';
import { ServicoSeo } from './seo';
import { DocumentosEdge } from './documentos-edge';
import { PdfNuvem } from './pdf-wasm';
import { PublicadorWordPress, credencialWordPress } from './wordpress';
import { WorkerHub } from './worker';
import { criarServidor } from './servidor';
import { adaptarWeb } from './adaptador-web';
export interface AmbienteEdge {
    get: (nome: string) => string | undefined;
    lerWasm: () => Promise<Uint8Array>;
}
export function criarRuntimeEdge(ambiente: AmbienteEdge) {
    const get = (n: string) => {
        const v = ambiente.get(n);
        if (!v)
            throw new Error(`Falta ${n} no backend privado.`);
        return v;
    }, url = get('SUPABASE_URL'), anon = get('SUPABASE_ANON_KEY'), sb = clienteServico(url, get('SUPABASE_SERVICE_ROLE_KEY'));
    const origens = new Set(get('HUB_ORIGENS').split(',').map(x => x.trim()));
    for (const o of origens) {
        const u = new URL(o);
        if (u.origin !== o || u.protocol !== 'https:')
            throw new Error('As origens do Hub têm de ser HTTPS exatas.');
    }
    const env = new Proxy({} as Record<string, string | undefined>, { get: (_t, p) => typeof p === 'string' ? ambiente.get(p) : undefined }), doc = new DocumentosEdge(sb, new PdfNuvem(ambiente.lerWasm)), seo = new ServicoSeo(sb, () => ({ login: ambiente.get('DATAFORSEO_LOGIN'), password: ambiente.get('DATAFORSEO_PASSWORD'), deepseek: ambiente.get('DEEPSEEK_API_KEY') }), true,()=>ambiente.get('HUB_WEBHOOKS_EDITORIAIS'));
    const wp = new PublicadorWordPress(sb, s => credencialWordPress(s, env), () => ambiente.get('HUB_WORDPRESS_PUBLICAR') === '1'), worker = new WorkerHub(sb, seo, doc, '/tmp/hub-worker', j => wp.executar(j), s => ambiente.get('HUB_WORDPRESS_PUBLICAR') === '1' && !!credencialWordPress(s, env), j => doc.parte(j));
    const fetch = adaptarWeb(criarServidor({ url, anon, origens, pasta: '/tmp/hub-worker' }, { sb, seo, documentos: doc, wordpress: wp }));
    return { fetch, async trabalhar(req: Request) {
            const chave = req.headers.get('x-hub-worker');
            if (!chave || chave.length < 32)
                return Response.json({ erro: 'Não autorizado.' }, { status: 401 });
            const c = await sb.from('hub_worker_config').select('token,ativo').eq('id', true).single();
            if (c.error || c.data?.ativo !== true || c.data.token !== chave)
                return Response.json({ erro: 'Não autorizado.' }, { status: 401 });
            try {
                await worker.passo();
                return Response.json({ processado: true });
            }
            catch {
                return Response.json({ erro: 'O ciclo não terminou. Consulta a fila privada; não repetir serviços pagos.' }, { status: 503 });
            }
        } };
}
